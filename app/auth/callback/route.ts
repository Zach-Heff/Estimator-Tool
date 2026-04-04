import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase sends users here after they click the link in a password reset email.
// The URL includes a `code` param that we exchange for an authenticated session,
// then redirect to the reset-password page where they can set a new password.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now active — send them to set a new password
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // If something went wrong, send them back to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=reset_failed`);
}
