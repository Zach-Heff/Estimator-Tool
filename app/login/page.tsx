"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Toggle between login form and password reset form
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check if onboarding is complete by looking for a company address.
    // If the admin hasn't filled in company details yet, send them to onboarding.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        const { data: company } = await supabase
          .from("companies")
          .select("address")
          .eq("id", profile.company_id)
          .single();

        // No address means onboarding wasn't completed
        if (!company?.address) {
          router.push("/onboarding");
          return;
        }
      }
    }

    router.push("/dashboard");
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // Supabase sends a reset link to this email address.
    // The link points to /auth/callback, which exchanges the code for a session
    // and redirects to /reset-password where the user sets a new password.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Log in to QuoteCraft
          </CardTitle>
          <CardDescription>
            Welcome back — let&apos;s build some quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showReset ? (
            // ─── Password Reset Form ──────────────────────────────────
            resetSent ? (
              <div className="space-y-4 text-center">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="font-semibold text-green-800">Check your email!</p>
                  <p className="mt-1 text-sm text-green-700">
                    We sent a password reset link. Click it to set a new password.
                  </p>
                </div>
                <button
                  onClick={() => { setShowReset(false); setResetSent(false); setError(""); }}
                  className="text-sm text-primary underline"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(""); }}
                  className="w-full text-center text-sm text-muted-foreground underline"
                >
                  Back to login
                </button>
              </form>
            )
          ) : (
            // ─── Login Form ───────────────────────────────────────────
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setError(""); }}
                    className="text-xs text-muted-foreground underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        fill="currentColor"
                        className="opacity-75"
                      />
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  "Log in"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary underline">
                  Sign up
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
