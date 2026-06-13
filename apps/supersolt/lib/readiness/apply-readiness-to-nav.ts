import type { ReadinessCompactDto, ReadinessModuleId } from "@/entities/readiness/model/types";
import {
  pathSuffixFromScopedNavUrl,
  readinessModuleIdFromPathSuffix,
} from "@/entities/readiness/lib/module-paths";
import type { NavMainItem, NavMainSubItem } from "@/components/organisms/nav-main";

export type NavReadinessSubItem = NavMainSubItem & {
  readinessModuleId?: ReadinessModuleId;
  lockStatus?: "unlocked" | "locked" | "hidden";
};

export type NavReadinessItem = Omit<NavMainItem, "items"> & {
  readinessModuleId?: ReadinessModuleId;
  lockStatus?: "unlocked" | "locked" | "hidden";
  items?: NavReadinessSubItem[];
};

function pathSuffixFromNavUrl(url: string): string | null {
  return pathSuffixFromScopedNavUrl(url);
}

function moduleStatus(
  readiness: ReadinessCompactDto | null | undefined,
  moduleId: ReadinessModuleId | null | undefined,
): "unlocked" | "locked" | "hidden" {
  if (!readiness?.appliesGating || !moduleId) {
    return "unlocked";
  }
  return readiness.modules[moduleId] ?? "unlocked";
}

function attachModuleToSubItem(
  subItem: NavMainSubItem,
  readiness: ReadinessCompactDto | null | undefined,
): NavReadinessSubItem | null {
  const suffix = pathSuffixFromNavUrl(subItem.url);
  const moduleId = suffix ? readinessModuleIdFromPathSuffix(suffix) : null;
  const lockStatus = moduleStatus(readiness, moduleId ?? undefined);

  if (lockStatus === "hidden") {
    return null;
  }

  return {
    ...subItem,
    readinessModuleId: moduleId ?? undefined,
    lockStatus,
  };
}

export function applyReadinessToNavItems(
  items: NavMainItem[],
  readiness: ReadinessCompactDto | null | undefined,
): NavReadinessItem[] {
  if (!readiness?.appliesGating) {
    return items.map((item) => ({
      ...item,
      lockStatus: "unlocked" as const,
      items: item.items?.map((subItem) => ({
        ...subItem,
        lockStatus: "unlocked" as const,
      })),
    }));
  }

  return items
    .map((item): NavReadinessItem | null => {
      const visibleChildren = (item.items ?? [])
        .map((subItem) => attachModuleToSubItem(subItem, readiness))
        .filter((subItem): subItem is NavReadinessSubItem => subItem !== null);

      const parentSuffix = pathSuffixFromNavUrl(item.url);
      const parentModuleId = parentSuffix
        ? readinessModuleIdFromPathSuffix(parentSuffix)
        : null;
      const parentDirectStatus = moduleStatus(
        readiness,
        parentModuleId ?? undefined,
      );

      const anyLockedChild = visibleChildren.some(
        (child) => child.lockStatus === "locked",
      );
      const anyUnlockedChild = visibleChildren.some(
        (child) => child.lockStatus === "unlocked",
      );

      let lockStatus: "unlocked" | "locked" | "hidden" = "unlocked";
      if (visibleChildren.length === 0) {
        lockStatus = parentDirectStatus === "hidden" ? "hidden" : parentDirectStatus;
      } else if (!anyUnlockedChild && anyLockedChild) {
        lockStatus = "locked";
      } else if (parentDirectStatus === "locked" && !anyUnlockedChild) {
        lockStatus = "locked";
      }

      if (lockStatus === "hidden") {
        return null;
      }

      return {
        ...item,
        readinessModuleId: parentModuleId ?? undefined,
        lockStatus,
        items: visibleChildren.length > 0 ? visibleChildren : undefined,
      };
    })
    .filter((item): item is NavReadinessItem => item !== null);
}

export function findNavItemLockStatus(
  items: NavReadinessItem[],
  url: string,
): NavReadinessItem | NavReadinessSubItem | null {
  for (const item of items) {
    if (item.url === url) {
      return item;
    }
    for (const subItem of item.items ?? []) {
      if (subItem.url === url) {
        return subItem;
      }
    }
  }
  return null;
}
