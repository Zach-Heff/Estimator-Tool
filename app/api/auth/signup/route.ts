import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/auth/signup
// Creates a new auth user, then creates the company and user profile rows.
// We use the admin client (service role) for creating company + user rows because
// at signup time the new user doesn't have a company_id yet, so RLS policies
// like get_user_company_id() would fail. The admin client bypasses RLS.
export async function POST(request: Request) {
  try {
    const { email, password, fullName, companyName } = await request.json();

    // Validate required fields
    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Step 1: Create the auth user in Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Step 2: Create company and user profile using admin client (bypasses RLS)
    const adminClient = createAdminClient();

    // Create the company row — just the name for now; rest comes during onboarding
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({ name: companyName })
      .select()
      .single();

    if (companyError) {
      return NextResponse.json(
        { error: "Failed to create company: " + companyError.message },
        { status: 500 }
      );
    }

    // Create the user profile row, linking to the company as admin
    const { error: userError } = await adminClient.from("users").insert({
      id: authData.user.id,
      company_id: company.id,
      email,
      full_name: fullName,
      role: "admin",
    });

    if (userError) {
      return NextResponse.json(
        { error: "Failed to create user profile: " + userError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
