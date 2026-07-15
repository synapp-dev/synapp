import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseMiddlewareClient,
  copySessionCookies as copyCookies,
} from "@workspace/supabase/middleware";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } =
    createSupabaseMiddlewareClient<Database>(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailConfirmed = Boolean(user?.email_confirmed_at);

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isLogoutRoute =
    pathname === "/logout" || pathname.startsWith("/logout/");

  const isMainRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (pathname === "/") {
    const target = user && emailConfirmed ? "/home" : "/auth";
    const redirectResponse = NextResponse.redirect(
      new URL(target, request.url)
    );
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  if (!user && isMainRoute) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  if (
    user &&
    !emailConfirmed &&
    isMainRoute &&
    !isAuthRoute &&
    !isLogoutRoute
  ) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("error", "confirm_email");
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  if (user && emailConfirmed && isAuthRoute) {
    const redirectResponse = NextResponse.redirect(
      new URL("/home", request.url)
    );
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  return getResponse();
}
