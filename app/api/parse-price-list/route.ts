// POST /api/parse-price-list — reads the price list file the user just
// uploaded to Supabase Storage, parses it, and populates the company's
// product_catalog table. Called from the onboarding flow (Step 3) after
// the file upload succeeds.
//
// MVP: CSV files only. XLSX would need a parser library (sheetjs) — out
// of scope for this round. If the friend uploads an .xlsx, we surface a
// clear error asking him to re-export as CSV.

import { createClient } from "@/lib/supabase/server";
import { parsePriceListCSV } from "@/lib/modules/pricing";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename || typeof filename !== "string") {
      return Response.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's company — needed to scope storage path + product_catalog
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // MVP supports CSV only. Reject other formats clearly so the user
    // knows what to do (re-export as CSV).
    if (!filename.toLowerCase().endsWith(".csv")) {
      return Response.json(
        {
          error:
            "Only CSV files are supported right now. Please export your spreadsheet as CSV and upload again.",
        },
        { status: 400 }
      );
    }

    // Download the uploaded file from Supabase Storage
    const path = `${profile.company_id}/${filename}`;
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("price-lists")
      .download(path);

    if (downloadError || !fileBlob) {
      console.error("Failed to download price list:", downloadError);
      return Response.json(
        { error: "Could not read uploaded file" },
        { status: 500 }
      );
    }

    const text = await fileBlob.text();
    const { rows: parsedRows, errors: parseErrors } = parsePriceListCSV(text);

    if (parsedRows.length === 0) {
      return Response.json(
        {
          error:
            "No valid rows found in the file. " +
            (parseErrors[0] ||
              "Expected columns: item name + price. Make sure the first row contains column headers."),
          parse_errors: parseErrors,
        },
        { status: 400 }
      );
    }

    // Clear existing catalog rows for this company before inserting the new
    // batch — re-uploading replaces rather than duplicating. (When we later
    // add edit-individual-rows UI, this strategy may change.)
    const { error: clearError } = await supabase
      .from("product_catalog")
      .delete()
      .eq("company_id", profile.company_id);

    if (clearError) {
      console.error("Failed to clear existing catalog:", clearError);
      // Continue anyway — the insert will succeed even with duplicates
    }

    const insertRows = parsedRows.map((r) => ({
      company_id: profile.company_id,
      original_name: r.name,
      // No AI normalization in MVP — canonical_name is just the original.
      // Future: have Claude normalize supplier-specific names to a canonical form.
      canonical_name: r.name,
      unit_price: r.unit_price,
      unit: r.unit ?? null,
      sku: r.sku ?? null,
      source_file: filename,
      manually_verified: false,
    }));

    const { error: insertError } = await supabase
      .from("product_catalog")
      .insert(insertRows);

    if (insertError) {
      console.error("Failed to insert price list:", insertError);
      return Response.json(
        {
          error: "Failed to save price list items: " + insertError.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      imported_count: parsedRows.length,
      parse_errors: parseErrors, // Surface any rows we skipped
    });
  } catch (error) {
    console.error("Parse price list error:", error);
    return Response.json(
      { error: "Failed to process price list" },
      { status: 500 }
    );
  }
}
