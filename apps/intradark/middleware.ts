import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Public page prefixes reachable without `site.access`. Everything else is
 * redirected to `/coming-soon` while the platform is in stealth blackout.
 * (API routes are excluded from this middleware via the matcher below, so the
 * Steam OpenID sign-in flow under `/api/auth/*` is never gated here.)
 */
const PUBLIC_PREFIXES = [
  "/coming-soon",
  "/auth",
  "/steam-username-email",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectPreservingSessionCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie.name, cookie.value);
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { response: sessionResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Stealth gate: only principals with `site.access` (or `developer`) may see
  // anything beyond the public pages. Fail closed — any signed-out visitor or
  // signed-in-but-unauthorized user (and any error resolving access) lands on
  // the coming-soon page. Authorized users fall through to normal routing.
  const authorized = user ? await hasSiteAccess(request, sessionResponse) : false;

  if (!authorized) {
    if (isPublicPath(pathname)) {
      return sessionResponse;
    }
    return redirectPreservingSessionCookies(
      request,
      sessionResponse,
      "/coming-soon",
    );
  }

  // --- Authorized routing below ---

  // Authorized users never need the holding page; send them into the app.
  if (pathname === "/coming-soon") {
    return redirectPreservingSessionCookies(
      request,
      sessionResponse,
      "/dashboard",
    );
  }

  if (pathname === "/") {
    return redirectPreservingSessionCookies(
      request,
      sessionResponse,
      "/dashboard",
    );
  }

  if (pathname === "/auth") {
    return redirectPreservingSessionCookies(
      request,
      sessionResponse,
      "/dashboard",
    );
  }

  return sessionResponse;
}

/**
 * Edge-safe authorization probe. Reuses the request's Supabase session (so the
 * RPC runs as the signed-in user) and calls the `has_site_access()` SECURITY
 * DEFINER function. Returns false on any error so the gate fails closed.
 */
async function hasSiteAccess(
  request: NextRequest,
  sessionResponse: NextResponse,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // updateSession already refreshed/forwarded the auth cookies on
          // sessionResponse; this probe must not mutate them further.
          for (const { name, value, options } of cookiesToSet) {
            sessionResponse.cookies.set(name, value, options);
          }
        },
      },
    });
    const { data, error } = await supabase.rpc("has_site_access");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (image file)
     * - any path with a file extension (public assets: /images/*.svg, fonts,
     *   etc.) — otherwise the stealth gate would redirect them to /coming-soon
     *   and the holding page's own logos would break.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
