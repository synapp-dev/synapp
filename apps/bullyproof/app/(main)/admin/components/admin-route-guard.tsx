"use client";

import { usePathname } from "next/navigation";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { adminSegmentToFeatureKey } from "@/lib/admin-items";

/**
 * Guards admin sub-routes by section. For /admin/content, /admin/schools, etc.,
 * requires the corresponding admin_* feature. For /admin exactly, only children
 * are rendered (landing page has its own FeatureGuard for "admin").
 */
export function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname?.split("/").filter(Boolean)[1];
  const featureKey = segment ? adminSegmentToFeatureKey[segment] : undefined;

  if (featureKey) {
    return (
      <>
        <FeatureGuard feature={featureKey} />
        {children}
      </>
    );
  }

  return <>{children}</>;
}
