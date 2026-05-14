export const UTILITY_MAP_POOL_SECTION_ORDER = [
  "active_duty",
  "reserve",
  "community",
] as const;

export function utilityMapPoolSectionHeading(
  poolSlug: string,
  fallbackLabel: string,
): string {
  switch (poolSlug) {
    case "active_duty":
      return "Active Duty";
    case "reserve":
      return "Reserved";
    case "community":
      return "Community";
    default:
      return fallbackLabel;
  }
}

/** Group maps for `/utility` and upload picker — same order as DB pool sort. */
export function groupMapsByUtilityPool<
  T extends { poolSlug: string; poolCategory: string },
>(maps: T[]): { poolSlug: string; heading: string; maps: T[] }[] {
  const bySlug = new Map<string, T[]>();
  for (const m of maps) {
    const next = bySlug.get(m.poolSlug) ?? [];
    next.push(m);
    bySlug.set(m.poolSlug, next);
  }

  const sections: { poolSlug: string; heading: string; maps: T[] }[] = [];

  for (const poolSlug of UTILITY_MAP_POOL_SECTION_ORDER) {
    const group = bySlug.get(poolSlug);
    if (group?.length) {
      sections.push({
        poolSlug,
        heading: utilityMapPoolSectionHeading(poolSlug, group[0]!.poolCategory),
        maps: group,
      });
      bySlug.delete(poolSlug);
    }
  }

  const rest = [...bySlug.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [poolSlug, group] of rest) {
    if (group.length) {
      sections.push({
        poolSlug,
        heading: utilityMapPoolSectionHeading(poolSlug, group[0]!.poolCategory),
        maps: group,
      });
    }
  }

  return sections;
}
