import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/types";

function copyCookies(
  sourceResponse: NextResponse,
  targetResponse: NextResponse
): void {
  sourceResponse.cookies.getAll().forEach((cookie) => {
    targetResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    });
  });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

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
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");
  const isLogoutRoute = pathname === "/logout" || pathname.startsWith("/logout/");

  const rootMainPrefixes = [
    "/dashboard",
    "/support",
    "/settings",
    "/logout",
    "/setup",
    "/agent",
  ];
  const reservedTopLevelSegments = new Set([
    "auth",
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
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && isMainRoute) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
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
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && needsSetup && isMainRoute && !isSetupRoute && !isLogoutRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/setup", request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && !needsSetup && isSetupRoute) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && emailConfirmed && isAuthRoute) {
    const target = needsSetup ? "/setup" : "/dashboard";
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}
