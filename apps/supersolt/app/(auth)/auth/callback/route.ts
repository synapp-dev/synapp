import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import type { Database } from "@/utils/supabase/types";

/**
 * Supabase email confirmation (and PKCE) redirect target.
 *
 * Dashboard checklist (supersolt-mvp):
 * - Authentication → URL configuration: add this route to Redirect URLs, e.g.
 *   `http://localhost:3005/auth/callback` and production `https://<host>/auth/callback`.
 * - Email provider: enable Confirm email for signups.
 * - Signup email template: confirmation link (Confirm signup).
 * - Sign-in OTP: Magic link template should include `{{ .Token }}` for 6-digit codes.
 *
 * Uses request/response cookie bridging (same idea as middleware) so session cookies
 * attach to the redirect response from this Route Handler.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const nextPath = safeRelativeNextPath(nextRaw) ?? "/dashboard";

  if (!code) {
    const fail = new URL("/auth", origin);
    fail.searchParams.set("error", "auth_callback_missing_code");
    return NextResponse.redirect(fail);
  }

  const successTarget = new URL(nextPath, request.url);
  let response = NextResponse.redirect(successTarget);

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
          response = NextResponse.redirect(successTarget);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const fail = new URL("/auth", origin);
    fail.searchParams.set("error", "auth_callback_exchange_failed");
    fail.searchParams.set("error_description", encodeURIComponent(error.message));
    return NextResponse.redirect(fail);
  }

  return response;
}
