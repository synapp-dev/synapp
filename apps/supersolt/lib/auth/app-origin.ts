/**
 * App origin for Supabase auth redirects (signup confirmation, password recovery).
 * Set `NEXT_PUBLIC_APP_URL` in dev (e.g. http://localhost:3005) so email links
 * match your local app even when browsing via a tunnel or proxy host.
 */
export function getAppOrigin(fallbackOrigin?: string): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return fallbackOrigin;
}

export function authCallbackUrl(
  nextPath: string,
  fallbackOrigin?: string,
): string | undefined {
  const origin = getAppOrigin(fallbackOrigin);
  if (!origin) {
    return undefined;
  }
  const next = nextPath.startsWith("/") ? nextPath : "/dashboard";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
