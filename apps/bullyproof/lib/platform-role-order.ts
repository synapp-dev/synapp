export const PLATFORM_ROLE_PRIORITY: Record<string, number> = {
  INTRADARK_DEV: 1,
  PLATFORM_ADMIN: 2,
  PLATFORM_MODERATOR: 3,
  PLATFORM_STAFF: 4,
  GOVERNMENT_VIEWER: 5,
};

type PlatformRoleLike = {
  key?: string | null;
  name?: string | null;
};

export function getPlatformRolePriority(roleKey?: string | null): number {
  if (!roleKey) return Number.MAX_SAFE_INTEGER;
  return PLATFORM_ROLE_PRIORITY[roleKey] ?? Number.MAX_SAFE_INTEGER;
}

export function sortPlatformRoles<T extends PlatformRoleLike>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const rankA = getPlatformRolePriority(a.key);
    const rankB = getPlatformRolePriority(b.key);
    if (rankA !== rankB) return rankA - rankB;

    const nameA = (a.name ?? a.key ?? "").toLowerCase();
    const nameB = (b.name ?? b.key ?? "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
