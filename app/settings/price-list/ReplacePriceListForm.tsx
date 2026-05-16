"use client";

// Client-side form that uploads a CSV to Supabase Storage and calls the
// existing /api/parse-price-list endpoint to replace the company's catalog.
//
// Pattern mirrors the onboarding Step 3 upload (app/onboarding/page.tsx ~602):
//   1. PUT the file to the price-lists bucket at ${companyId}/${filename}
//   2. POST /api/parse-price-list with { filename }
//   3. The API clears the old catalog and inserts the new rows
//   4. router.refresh() re-fetches the parent server component to show the new state

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReplacePriceListFormProps {
  companyId: string;
  currentCount: number;
}

interface ParseResult {
  imported_count: number;
  parse_errors: string[];
}

export default function ReplacePriceListForm({
  companyId,
  currentCount,
}: ReplacePriceListFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    // Defense in depth: backend will reject non-CSV, but tell the user up front
    // instead of round-tripping. Matches the API's check at parse-price-list/route.ts.
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported. Export your spreadsheet as CSV and try again.");
      return;
    }

    // Only confirm if there's actually a catalog to wipe. First-time uploads
    // don't need the scary prompt.
    if (currentCount > 0) {
      const ok = window.confirm(
        `This will replace your entire price list (currently ${currentCount} items) with the contents of "${file.name}". Continue?`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // 1. Upload to Supabase Storage. upsert: true means re-uploading the
      // same filename overwrites instead of erroring.
      const filePath = `${companyId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("price-lists")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        setError("Couldn't upload the file: " + uploadError.message);
        setSubmitting(false);
        return;
      }

      // 2. Parse server-side. The route clears the old catalog and inserts
      // the new rows under the same company_id.
      const parseRes = await fetch("/api/parse-price-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        setError(
          parseData.error ||
            "Could not parse your price list. Make sure it's a CSV with item name + price columns."
        );
        setSubmitting(false);
        return;
      }

      // 3. Success. Show count + any per-row errors, refresh the parent.
      setResult({
        imported_count: parseData.imported_count,
        parse_errors: parseData.parse_errors ?? [],
      });
      setFile(null);
      // Reset the file input so the same file can be re-selected if needed
      const fileInput = document.getElementById("priceListFile") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong uploading the file."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="priceListFile">CSV file</Label>
        <Input
          id="priceListFile"
          type="file"
          accept=".csv"
          disabled={submitting}
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            // 10MB limit — matches the onboarding flow's guard
            if (f && f.size > 10 * 1024 * 1024) {
              setError("File must be under 10MB.");
              e.target.value = "";
              setFile(null);
              return;
            }
            setError(null);
            setResult(null);
            setFile(f);
          }}
        />
        <p className="text-xs text-muted-foreground">
          CSV only, max 10MB. Expected columns: item name + price. Optional: SKU, unit.
        </p>
        {file && !error && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-medium">
            Imported {result.imported_count} items
            {result.parse_errors.length > 0 &&
              ` (${result.parse_errors.length} rows skipped)`}
            .
          </p>
          {result.parse_errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-green-800 hover:underline">
                View skipped rows
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {result.parse_errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <Button type="submit" disabled={!file || submitting}>
        {submitting
          ? "Uploading…"
          : currentCount === 0
            ? "Upload price list"
            : "Replace price list"}
      </Button>
    </form>
  );
}
