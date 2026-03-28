"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.full_name || "there");
      setLoading(false);
    }

    loadProfile();
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

      // Redirect to the quote workspace where the user builds the quote
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

        {/* Main action area */}
        <Card>
          <CardHeader>
            <CardTitle>Your Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Start a new quote by describing the scope of work. Our AI
              estimator will help you build an accurate, professional quote.
            </p>
            <Button
              size="lg"
              onClick={handleNewQuote}
              disabled={creatingQuote}
            >
              {creatingQuote ? "Creating..." : "+ New Quote"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
