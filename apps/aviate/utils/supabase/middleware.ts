import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@workspace/supabase/middleware";

type Database = Record<string, never>;

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } =
    createSupabaseMiddlewareClient<Database>(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supabaseResponse = getResponse();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isMainRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (pathname === "/") {
    const target = user ? "/dashboard" : "/auth";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!user && isMainRoute) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
