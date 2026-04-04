"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Quote } from "@/types/database";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load user profile and their quotes in parallel
      const [profileResult, quotesResult] = await Promise.all([
        supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("quotes")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      setUserName(profileResult.data?.full_name || "there");
      setQuotes(quotesResult.data || []);
      setLoading(false);
    }

    loadDashboard();
  }, [supabase, router]);

  async function handleNewQuote() {
    setCreatingQuote(true);
    try {
      const response = await fetch("/api/quotes", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create quote");
        return;
      }

      router.push(`/quotes/${data.id}/edit`);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCreatingQuote(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Determine a human-friendly status label for a quote
  function getStatusLabel(quote: Quote): { text: string; className: string } {
    if (quote.review_completed_at) {
      return { text: "Approved", className: "bg-green-100 text-green-800" };
    }
    if (quote.status === "sent") {
      return { text: "Sent", className: "bg-blue-100 text-blue-800" };
    }
    return { text: "Draft", className: "bg-zinc-100 text-zinc-600" };
  }

  // Format a date string into a short, readable format like "Apr 2, 2026"
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Format dollar amounts like $1,250.00
  function formatCurrency(amount: number | null): string {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header with welcome message and actions */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        {/* New Quote button */}
        <div className="mb-6">
          <Button
            size="lg"
            onClick={handleNewQuote}
            disabled={creatingQuote}
          >
            {creatingQuote ? "Creating..." : "+ New Quote"}
          </Button>
        </div>

        {/* Quotes list */}
        <Card>
          <CardHeader>
            <CardTitle>Your Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-muted-foreground">
                No quotes yet. Click &quot;+ New Quote&quot; to get started!
              </p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => {
                  const status = getStatusLabel(q);
                  return (
                    <button
                      key={q.id}
                      onClick={() => router.push(`/quotes/${q.id}/edit`)}
                      className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-zinc-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {q.quote_number}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </div>
                        {/* Show client name if we have one, otherwise show a snippet of the scope */}
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {q.client_name ||
                            q.scope_description?.slice(0, 80) ||
                            "No details yet"}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                        {/* Show subtotal if a quote has been generated */}
                        {q.subtotal != null && q.subtotal > 0 && (
                          <span className="font-semibold">
                            {formatCurrency(q.subtotal)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(q.created_at)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
