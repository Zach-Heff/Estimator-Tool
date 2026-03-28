import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js proxy runs on every matched request before the page renders.
// We use it to refresh Supabase auth sessions and protect routes.
// (Renamed from middleware.ts — Next.js 16 renamed the convention to "proxy".)
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run proxy on all routes except static files, images, and favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
