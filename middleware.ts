import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js middleware runs on every matched request before the page renders.
// We use it to refresh Supabase auth sessions and protect routes.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run middleware on all routes except static files, images, and favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
