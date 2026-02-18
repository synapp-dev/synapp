"use client";

import { useMemo } from "react";
import { getEnabledAdminItems } from "@/lib/admin-items";
import { AdminCard } from "./components/admin-card";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useFeaturesAccess } from "@/hooks/use-features-access";

export function AdminPageClient() {
  const adminItems = getEnabledAdminItems();
  const adminFeatureKeys = useMemo(
    () => [...new Set([...adminItems.map((item) => item.featureKey), "/admin"])],
    [adminItems]
  );
  const featuresAccess = useFeaturesAccess(adminFeatureKeys);

  const itemsWithAccess = useMemo(() => {
    return adminItems
      .filter((item) => {
        const access =
          featuresAccess[item.featureKey] ??
          (item.featureKey === "/admin/resources"
            ? featuresAccess["/admin"]
            : undefined);
        return access?.visible ?? false;
      })
      .map((item) => {
        const access =
          featuresAccess[item.featureKey] ??
          (item.featureKey === "/admin/resources"
            ? featuresAccess["/admin"]
            : undefined);
        const locked = access?.visible && !access?.hasAccess;
        return {
          ...item,
          disabled: item.disabled === true || locked,
        };
      })
      .sort((a, b) => Number(a.disabled) - Number(b.disabled));
  }, [adminItems, featuresAccess]);

  return (
    <>
      <FeatureGuard feature="/admin" />
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {itemsWithAccess.map((item) => (
            <AdminCard
              key={item.title}
              title={item.title}
              url={item.url}
              iconName={item.iconName}
              description={item.description}
              disabled={item.disabled}
            />
          ))}
        </div>
      </div>
    </>
  );
}
