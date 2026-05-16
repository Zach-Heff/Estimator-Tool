// POST /api/generate-pdf
// Generates a branded PDF for an approved quote and returns it as binary data.
// The caller (frontend modal) receives this as a blob and displays it in an iframe.

import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import { makePdfFilename } from "@/lib/utils/pdf-filename";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { quote_id } = await request.json();

    if (!quote_id) {
      return Response.json(
        { error: "quote_id is required" },
        { status: 400 }
      );
    }

    // Authenticate using the cookie-based Supabase client (respects RLS)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Fetch the quote ──
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    // Gate: quote must be approved before PDF export
    if (!quote.review_completed_at) {
      return Response.json(
        { error: "Quote must be approved before generating a PDF" },
        { status: 403 }
      );
    }

    // ── Fetch the estimator's name (quote creator) for "Performed by" ──
    const { data: estimator } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", quote.created_by)
      .single();

    // ── Fetch the company (for branding) ──
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", quote.company_id)
      .single();

    if (companyError || !company) {
      return Response.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // ── Fetch line items sorted by sort_order ──
    const { data: lineItems, error: itemsError } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quote_id)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      return Response.json(
        { error: "Failed to load line items" },
        { status: 500 }
      );
    }

    // ── Fetch the company logo from Supabase Storage ──
    // logo_url should store the storage path (e.g., "companyId/logo.png").
    // Older records may have a full public URL — we extract the path from it.
    let logoBase64: string | null = null;

    if (company.logo_url) {
      try {
        // Handle both formats: full public URL (legacy) or just the storage path (correct)
        let storagePath = company.logo_url;
        if (storagePath.startsWith("http")) {
          // Extract the path after "/company-logos/" from the full URL
          const marker = "/company-logos/";
          const idx = storagePath.indexOf(marker);
          if (idx !== -1) {
            storagePath = storagePath.substring(idx + marker.length);
          }
        }

        const { data: logoData } = await supabase.storage
          .from("company-logos")
          .download(storagePath);

        if (logoData) {
          const arrayBuffer = await logoData.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          // Detect MIME type from the file extension
          const ext = company.logo_url.split(".").pop()?.toLowerCase();
          const mime =
            ext === "png"
              ? "image/png"
              : ext === "svg"
                ? "image/svg+xml"
                : "image/jpeg";
          logoBase64 = `data:${mime};base64,${base64}`;
        }
      } catch {
        // Logo fetch failed — continue without it. The PDF will just skip the logo.
        console.warn("Failed to fetch company logo, generating PDF without it");
      }
    }

    // ── Render the PDF ──
    const pdfBuffer = await renderToBuffer(
      QuoteDocument({
        company: {
          name: company.name,
          address: company.address,
          phone: company.phone,
          license_number: company.license_number,
          logo_base64: logoBase64,
          default_payment_terms: company.default_payment_terms,
          default_quote_validity_days: company.default_quote_validity_days,
        },
        quote: {
          quote_number: quote.quote_number,
          created_at: quote.created_at || new Date().toISOString(),
          client_name: quote.client_name,
          client_email: quote.client_email,
          client_address: quote.client_address,
          job_site_address: quote.job_site_address,
          tax_rate: quote.tax_rate ?? 0,
          // Default to 'materials' to match the migration default. The PDF
          // hides the tax row entirely if rate is 0 OR basis is 'none'.
          tax_basis:
            (quote.tax_basis as "materials" | "subtotal" | "none" | null) ??
            "materials",
        },
        estimatorName: estimator?.full_name || "Unknown",
        lineItems: (lineItems || []).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          margin_percent: item.margin_percent,
          item_type: item.item_type,
          category: item.category || "General",
        })),
      })
    );

    // Return the PDF as a binary response. Filename here is what viewers
    // that honor Content-Disposition will use (e.g., browser context-menu
    // "Save As"). The in-modal Download button passes the SAME filename
    // via the <a download> attribute, which is the universal fallback.
    const filename = makePdfFilename(
      quote.quote_number,
      quote.client_name,
      quote.created_at || new Date().toISOString()
    );
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return Response.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
