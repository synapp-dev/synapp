import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import type { NavMainSidebarItem } from "@/lib/main-nav-routes";

import { SEGMENT_TO_NAV_SLUG } from "./nav-slugs";
import { hasRoutePermission } from "./route-permission";

function firstSegmentFromUrl(url: string): string {
  const s = url.replace(/^\//, "").split("/")[0];
  return s ?? "";
}

function navItemVisible(url: string, slugs: readonly string[]): boolean {
  const seg = firstSegmentFromUrl(url);
  if (seg === "play") return true;
  const req = SEGMENT_TO_NAV_SLUG[seg];
  if (!req) return true;
  return hasRoutePermission(slugs, req);
}

/**
 * Apply RBAC to sidebar items; Play stays visible but may be disabled for non-developers.
 */
export function applyNavRbacToItems(
  items: NavMainSidebarItem[],
  slugs: readonly string[],
): NavMainSidebarItem[] {
  const out: NavMainSidebarItem[] = [];

  for (const item of items) {
    const seg = firstSegmentFromUrl(item.url);
    if (seg === "play") {
      const canPlay = hasRoutePermission(slugs, ROLE_DEVELOPER);
      out.push({
        ...item,
        disabled: !canPlay,
        disabledMessage: canPlay ? undefined : "Locked",
      });
      continue;
    }

    if (!navItemVisible(item.url, slugs)) continue;

    if (item.items && item.items.length > 0) {
      const subs = item.items.filter((sub) =>
        navItemVisible(sub.url, slugs),
      );
      if (subs.length === 0) continue;
      out.push({ ...item, items: subs });
      continue;
    }

    out.push(item);
  }

  return out;
}
