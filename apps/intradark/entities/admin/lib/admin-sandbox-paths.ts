/** Maps legacy `/sandbox/...` paths to `/admin/sandbox/...` (for redirects / bookmarks). */
export function canonicalAdminSandboxPath(pathname: string): string {
  if (pathname === "/sandbox") return "/admin/sandbox";
  if (pathname.startsWith("/sandbox/")) {
    return `/admin/sandbox${pathname.slice("/sandbox".length)}`;
  }
  return pathname;
}
