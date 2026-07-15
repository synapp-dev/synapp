import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseMiddlewareClient,
  copySessionCookies as copyCookies,
} from "@workspace/supabase/middleware";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { ONBOARDING_EARLY_SALES_COOKIE } from "@/entities/onboarding/lib/onboarding-cookies";
import { isEarlyOnboardingScopedPathAllowed } from "@/lib/onboarding/module-gates";
import {
  VENUE_SCOPE_COOKIE_NAME,
  parseVenueScopeCookie,
} from "@/lib/venue-scope-cookie";
import type { Database } from "@/utils/supabase/types";

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } =
    createSupabaseMiddlewareClient<Database>(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailConfirmed = Boolean(user?.email_confirmed_at);

  let needsSetup = false;
  if (user && emailConfirmed) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("setup_completed_at")
      .eq("id", user.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .maybeSingle();

    needsSetup = !profile?.setup_completed_at;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isUpdatePasswordRoute =
    pathname === "/auth/update-password" ||
    pathname.startsWith("/auth/update-password/");
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");
  const isLogoutRoute = pathname === "/logout" || pathname.startsWith("/logout/");

  const rootMainPrefixes = [
    "/about",
    "/dashboard",
    "/support",
    "/settings",
    "/logout",
    "/setup",
    "/agent",
  ];
  
  const reservedTopLevelSegments = new Set([
    "auth",
    "about",
    "dashboard",
    "support",
    "settings",
    "logout",
    "setup",
    "agent",
    "api",
    "_next",
    // Next.js serves `public/images/*` at `/images/*`; must not match venue routes `/:org/:venue/...`
    "images",
  ]);
  const isRootMainRoute = rootMainPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const pathSegments = pathname.split("/").filter(Boolean);
  const hasScopedMainRoute =
    pathSegments.length >= 2 &&
    !reservedTopLevelSegments.has(pathSegments[0] ?? "");
  const isMainRoute = isRootMainRoute || hasScopedMainRoute;

  if (pathname === "/") {
    const target =
      user && !emailConfirmed
        ? "/auth"
        : user
          ? needsSetup
            ? "/setup"
            : "/dashboard"
          : "/auth";
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
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

  if (user && needsSetup && isMainRoute && !isSetupRoute && !isLogoutRoute) {
    const earlyOnboardingOk =
      request.cookies.get(ONBOARDING_EARLY_SALES_COOKIE)?.value === "1" &&
      isEarlyOnboardingScopedPathAllowed(pathname, true);
    if (!earlyOnboardingOk) {
      const redirectResponse = NextResponse.redirect(new URL("/setup", request.url));
      copyCookies(getResponse(), redirectResponse);
      return redirectResponse;
    }
  }

  if (user && !needsSetup && isSetupRoute) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  if (user && emailConfirmed && isAuthRoute && !isUpdatePasswordRoute) {
    const target = needsSetup ? "/setup" : "/dashboard";
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    copyCookies(getResponse(), redirectResponse);
    return redirectResponse;
  }

  // Skip the /dashboard → scoped → /dashboard redirect loop when the venue cookie
  // points at a slug the user no longer has (scoped pages recover via bootstrap).
  if (user && emailConfirmed && !needsSetup) {
    const preferred = parseVenueScopeCookie(
      request.cookies.get(VENUE_SCOPE_COOKIE_NAME)?.value,
    );
    if (preferred) {
      if (pathname === "/dashboard") {
        const redirectResponse = NextResponse.redirect(
          new URL(
            buildScopedPath(
              preferred.organisationSlug,
              preferred.venueSlug,
              "dashboard",
            ),
            request.url,
          ),
        );
        copyCookies(getResponse(), redirectResponse);
        return redirectResponse;
      }
      if (pathname === "/agent") {
        const redirectResponse = NextResponse.redirect(
          new URL(
            buildScopedPath(
              preferred.organisationSlug,
              preferred.venueSlug,
              "agent",
            ),
            request.url,
          ),
        );
        copyCookies(getResponse(), redirectResponse);
        return redirectResponse;
      }
    }
  }

  return getResponse();
}
