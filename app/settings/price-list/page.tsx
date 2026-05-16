// Admin-only Price List management page. Currently supports:
//   - Viewing the current catalog (count, last updated, source file, preview rows)
//   - Replacing the whole catalog by uploading a new CSV (reuses /api/parse-price-list)
//
// Per-row editing, add-one-row, and delete-one-row are intentionally deferred —
// re-upload covers the most common case (supplier sends a fresh price sheet)
// and keeps the surface area small for now.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ReplacePriceListForm from "./ReplacePriceListForm";

// How many preview rows to render in the table. Above this we still show the
// count + last-updated info, with a "Showing N of M" footer.
const PREVIEW_LIMIT = 50;

interface CatalogRow {
  id: string;
  original_name: string;
  sku: string | null;
  unit: string | null;
  unit_price: number;
  source_file: string | null;
  updated_at: string;
}

export default async function PriceListSettingsPage() {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Role + company lookup. RLS would block writes from a non-admin anyway,
  // but we redirect explicitly so an estimator gets a clean UX instead of a
  // silent permission failure deeper in the form submit.
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // No profile row — orphan auth.users entry. Send them through onboarding.
    redirect("/onboarding");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  // 3. Fetch current catalog (preview rows + total count in parallel).
  // The two queries are scoped by company_id via RLS automatically, but we
  // also filter explicitly for defense-in-depth and so the query plan is clean.
  const [rowsResult, countResult] = await Promise.all([
    supabase
      .from("product_catalog")
      .select("id, original_name, sku, unit, unit_price, source_file, updated_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true })
      .limit(PREVIEW_LIMIT),
    supabase
      .from("product_catalog")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profile.company_id),
  ]);

  const rows = (rowsResult.data ?? []) as CatalogRow[];
  const totalCount = countResult.count ?? 0;

  // Most-recent updated_at across all rows. We pull it from the first row when
  // the catalog is empty rather than running a third query.
  const lastUpdated = rows.length > 0
    ? rows.reduce((latest, r) => (r.updated_at > latest ? r.updated_at : latest), rows[0].updated_at)
    : null;
  const sourceFile = rows[0]?.source_file ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Price List</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the supplier price list your quotes are matched against.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>

        {/* Current catalog summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Current price list</CardTitle>
            <CardDescription>
              {totalCount === 0
                ? "You haven't uploaded a price list yet. Quotes will use AI estimates for all materials until you upload one."
                : `${totalCount} items in your catalog.`}
            </CardDescription>
          </CardHeader>
          {totalCount > 0 && (
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Total items</dt>
                  <dd className="mt-1 font-medium">{totalCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="mt-1 font-medium">
                    {lastUpdated
                      ? new Date(lastUpdated).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source file</dt>
                  <dd className="mt-1 truncate font-medium" title={sourceFile ?? undefined}>
                    {sourceFile ?? "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          )}
        </Card>

        {/* Preview table */}
        {totalCount > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
              <CardDescription>
                {totalCount > PREVIEW_LIMIT
                  ? `Showing the first ${PREVIEW_LIMIT} of ${totalCount}. The matcher still uses your full list when generating quotes.`
                  : `All ${totalCount} items in your catalog.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-zinc-50 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">SKU</th>
                      <th className="px-3 py-2.5">Unit</th>
                      <th className="px-3 py-2.5 text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{r.original_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.sku ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.unit ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${r.unit_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Replace form (client component) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {totalCount === 0 ? "Upload your price list" : "Replace price list"}
            </CardTitle>
            <CardDescription>
              {totalCount === 0
                ? "Upload a CSV with item name + price columns. Optional: SKU and unit columns."
                : "Upload a new CSV to replace the current catalog. The existing items will be deleted and the new file will be imported in their place."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReplacePriceListForm
              companyId={profile.company_id}
              currentCount={totalCount}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
