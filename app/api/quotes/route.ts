import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// POST /api/quotes — creates a new draft quote.
// Auto-generates the quote number (Q-1001, Q-1002, ...) and inherits
// default margins, payment terms, and validity period from the company record.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's company info — we need defaults for the new quote
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    const { data: company } = await supabase
      .from("companies")
      .select(
        "default_labor_margin, default_material_margin, default_payment_terms, default_quote_validity_days, default_labor_mode, default_labor_rate_per_hour, default_tax_rate, default_tax_basis"
      )
      .eq("id", profile.company_id)
      .single();

    // Generate the next sequential quote number.
    // We count existing quotes for this company to avoid collisions.
    // Starting at Q-1001 so it looks professional (not Q-1).
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id);

    const quoteNumber = `Q-${1001 + (count || 0)}`;

    // Calculate expiration date from company's default validity period
    const validityDays = company?.default_quote_validity_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Create the quote with all inherited defaults.
    // job_type defaults to 'residential' (set by the migration) — the owner
    // can flip to commercial in the Job Settings section. job_category
    // starts null because the owner picks it before the chat starts.
    // labor_mode and labor_rate_per_hour are inherited from the company,
    // editable per quote in case the owner prices this job differently.
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        quote_number: quoteNumber,
        status: "draft",
        labor_margin_default: company?.default_labor_margin,
        material_margin_default: company?.default_material_margin,
        payment_terms: company?.default_payment_terms,
        expires_at: expiresAt.toISOString(),
        labor_mode: company?.default_labor_mode ?? "margin_on_cost",
        labor_rate_per_hour: company?.default_labor_rate_per_hour ?? null,
        // Inherit tax defaults — owner can override per quote in the Job
        // Settings section. tax_rate stays null if the company didn't set one
        // (PDF interprets null/0 as "hide the tax row").
        tax_rate: company?.default_tax_rate ?? null,
        tax_basis: company?.default_tax_basis ?? "materials",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create quote:", error);
      return Response.json(
        { error: "Failed to create quote" },
        { status: 500 }
      );
    }

    return Response.json({ id: quote.id, quote_number: quoteNumber });
  } catch (error) {
    console.error("Create quote error:", error);
    return Response.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
