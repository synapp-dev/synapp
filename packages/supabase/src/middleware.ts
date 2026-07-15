import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Supabase client bound to the request cookie store.
 *
 * Do not run code between this call and `supabase.auth.getUser()`; a simple
 * mistake can make it very hard to debug users being randomly logged out.
 *
 * Read the response via `getResponse()` AFTER awaiting `auth.getUser()`:
 * refreshing the session reassigns the response inside `setAll`, and the
 * getter always returns the latest one. When you return a redirect instead,
 * copy the session cookies onto it with `copySessionCookies`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseMiddlewareClient<Database = any>(
  request: NextRequest
) {
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
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

/**
 * Copies cookies from the session response onto a redirect (or other
 * replacement) response so refreshed Supabase session cookies survive.
 */
export function copySessionCookies(
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
