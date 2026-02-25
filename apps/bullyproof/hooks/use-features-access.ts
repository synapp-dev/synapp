"use client";

import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { checkFeatureAccessAndVisibleCached } from "@/utils/check-feature-access-cached";

export type FeatureAccessResult = { hasAccess: boolean; visible: boolean };

/**
 * Hook to check access and visibility for multiple features at once.
 * Uses cached feature permissions from the me store (fetched once on load).
 *
 * @param featureKeys - Array of feature keys to check
 * @param schoolId - Optional school ID for school-specific feature checks
 * @returns Object mapping feature keys to { hasAccess, visible }
 *
 * @example
 * ```tsx
 * const features = useFeaturesAccess(["lessons", "content", "admin"], schoolId);
 * if (features.lessons.hasAccess) return <LessonsPage />;
 * if (features.lessons.visible) return <LockedMenuItem />;
 * ```
 */
export function useFeaturesAccess(
  featureKeys: string[],
  schoolId?: string
): Record<string, FeatureAccessResult> {
  const effectiveUser = useMeStore((s) => s.viewAsUser ?? s.currentUser);

  const featuresAccess = useMemo(() => {
    if (!effectiveUser || featureKeys.length === 0) {
      return {};
    }

    const result: Record<string, FeatureAccessResult> = {};
    for (const featureKey of featureKeys) {
      result[featureKey] = checkFeatureAccessAndVisibleCached(
        effectiveUser.featurePermissions,
        featureKey,
        schoolId,
        effectiveUser.roleIds
      );
    }
    return result;
  }, [effectiveUser?.featurePermissions, featureKeys, schoolId, effectiveUser?.roleIds]);

  return featuresAccess;
}
