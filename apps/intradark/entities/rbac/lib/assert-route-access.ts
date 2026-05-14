import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";

import { getEffectiveSlugsForPrincipal } from "./get-effective-role-slugs";
import { SEGMENT_TO_NAV_SLUG } from "./nav-slugs";
import { hasRoutePermission } from "./route-permission";

const PUBLIC_REDIRECT = "/news";

function firstSegment(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] ?? null;
}

/**
 * Server layouts for `(main)/:segment/**` — enforce navigation RBAC.
 *
 * @param staffSegment — when true, deny with `notFound()` (admin-style); otherwise redirect to `PUBLIC_REDIRECT`.
 */
export async function assertNavSegmentAccess(
  pathname: string,
  opts?: { staffSegment?: boolean },
): Promise<void> {
  const segment = firstSegment(pathname);
  if (!segment) return;

  const required =
    segment === "play"
      ? ROLE_DEVELOPER
      : SEGMENT_TO_NAV_SLUG[segment];
  if (!required) return;

  const userId = await getSessionUserId();
  const slugs = await getEffectiveSlugsForPrincipal(userId);

  if (hasRoutePermission(slugs, required)) return;

  if (opts?.staffSegment) {
    notFound();
  } else {
    redirect(PUBLIC_REDIRECT);
  }
}
