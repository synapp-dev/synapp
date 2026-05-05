import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    "/home/:path*",
    "/agent",
    "/dashboard/:path*",
    "/calendar/:path*",
    "/knowledge",
    "/review",
    "/identity/:path*",
    "/health/:path*",
    "/work/:path*",
    "/social/:path*",
    "/finance/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
