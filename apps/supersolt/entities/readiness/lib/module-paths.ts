import type { ReadinessModuleId } from "@/entities/readiness/model/types";

/** Route suffix (after /{org}/{venue}/) → readiness module. */
export const PATH_SUFFIX_TO_READINESS_MODULE: Record<
  string,
  ReadinessModuleId
> = {
  "settings/inventory-setup/inventory/master-list": "menu-ingredients",
  "settings/inventory": "menu-ingredients",
  "purchasing/orders": "purchasing-orders",
  "stock-management/stock-counts": "stock-counts",
  "stock-management/waste": "stock-waste",
  "workforce/roster": "workforce-roster",
};

export function readinessModuleIdFromPathSuffix(
  pathSuffix: string,
): ReadinessModuleId | null {
  const normalized = pathSuffix.replace(/^\/+/, "").replace(/\/+$/, "");
  return PATH_SUFFIX_TO_READINESS_MODULE[normalized] ?? null;
}

export function pathSuffixFromScopedNavUrl(url: string): string | null {
  const match = url.match(/^\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  return match[3] ?? null;
}
