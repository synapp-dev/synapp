/**
 * Dedicated full-page agent route — no right sidebar chrome.
 */
export function isAgentOnlyRoute(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return normalized === "/agent";
}

export function shouldShowAgentRightShell(pathname: string): boolean {
  return !isAgentOnlyRoute(pathname);
}
