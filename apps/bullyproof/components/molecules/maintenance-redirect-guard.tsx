"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFeaturesAccess } from "@/hooks/use-features-access";
import { useMeStore } from "@/entities/me/model/store";
import { MAINTENANCE_FEATURE_KEY } from "@/lib/feature-keys";

/**
 * Redirects users based on maintenance feature:
 * - If maintenance is enabled for the user (and they are not a bypass dev), redirect to /maintenance when not already there.
 * - If maintenance is not in effect for the user and they are on /maintenance, redirect to /dashboard.
 */
export function MaintenanceRedirectGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useMeStore((s) => s.currentUser);
  const featuresAccess = useFeaturesAccess([MAINTENANCE_FEATURE_KEY]);
  const maintenance = featuresAccess[MAINTENANCE_FEATURE_KEY];
  const hasMaintenanceAccess = maintenance?.hasAccess ?? false;
  const effectiveMaintenance =
    hasMaintenanceAccess && !currentUser?.maintenanceBypass;

  useEffect(() => {
    if (effectiveMaintenance && pathname !== "/maintenance") {
      router.replace("/maintenance");
      return;
    }
    if (!effectiveMaintenance && pathname === "/maintenance") {
      router.replace("/dashboard");
    }
  }, [effectiveMaintenance, pathname, router]);

  return null;
}
