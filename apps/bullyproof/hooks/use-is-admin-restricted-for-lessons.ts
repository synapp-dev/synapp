"use client";

import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { ADMIN_CANNOT_CREATE_LESSON_KEYS } from "@/lib/role-keys";

/** Normalize platformRoles to string[] (handles PostgreSQL array string or array) */
function normalizePlatformRoles(platformRoles: unknown): string[] {
  if (Array.isArray(platformRoles)) {
    return platformRoles.filter((r): r is string => typeof r === "string");
  }
  if (typeof platformRoles === "string") {
    // PostgreSQL array format: "{value1,value2}" or "value1,value2"
    const trimmed = platformRoles.replace(/^\{|\}$/g, "").trim();
    if (!trimmed) return [];
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Returns true if the current user has a platform role that cannot create lessons
 * in their own name (INTRADARK_DEV, PLATFORM_ADMIN, PLATFORM_MODERATOR, PLATFORM_STAFF).
 */
export function useIsAdminRestrictedForLessons(): boolean {
  const currentUser = useMeStore((s) => s.currentUser);

  return useMemo(() => {
    const roles = normalizePlatformRoles(currentUser?.platformRoles);
    return roles.some((key) =>
      ADMIN_CANNOT_CREATE_LESSON_KEYS.includes(
        key as (typeof ADMIN_CANNOT_CREATE_LESSON_KEYS)[number]
      )
    );
  }, [currentUser?.platformRoles]);
}
