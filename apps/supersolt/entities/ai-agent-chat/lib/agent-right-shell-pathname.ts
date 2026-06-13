import { getScopedContextFromPathname } from "@/entities/access/scoped-navigation-context";

/**
 * Dedicated full-page agent route — no right sidebar chrome.
 */
export function isAgentOnlyRoute(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (normalized === "/agent") {
    return true;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 3 && segments[2] === "agent") {
    return getScopedContextFromPathname(normalized) !== null;
  }

  return false;
}

export function shouldShowAgentRightShell(pathname: string): boolean {
  return !isAgentOnlyRoute(pathname);
}
