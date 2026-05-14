export const AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY = "supersolt:agentNavAutoRedirect:v1";

/** Long enough for layout swap + pathname sync after `router.push`; avoids blocking a later `/agent` suggestion indefinitely. */
export const AGENT_NAV_AUTO_REDIRECT_TTL_MS = 45_000;

type StoredPayload = { href: string; at: number };

export function normalizeAppNavHref(href: string): string {
  const trimmed = href.trim().replace(/\/+$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

export function appNavPathsMatch(pathname: string, href: string): boolean {
  return normalizeAppNavHref(pathname) === normalizeAppNavHref(href);
}

export function readRecentAgentNavAutoRedirect(targetHref: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as StoredPayload;
    if (typeof data?.href !== "string" || typeof data?.at !== "number") return false;
    if (!appNavPathsMatch(data.href, targetHref)) return false;
    if (Date.now() - data.at > AGENT_NAV_AUTO_REDIRECT_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export function markAgentNavAutoRedirect(href: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY,
      JSON.stringify({
        href: normalizeAppNavHref(href),
        at: Date.now(),
      } satisfies StoredPayload),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearAgentNavAutoRedirectMarker(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
