"use client";

import { usePathname } from "next/navigation";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { InventorySetupSectionNav } from "@/app/(main)/[organisation]/[venue]/settings/inventory-setup/_components/inventory-setup-section-nav";
import { SetupStepperBanner } from "@/entities/inventory-setup/components/setup-stepper-banner";
import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

export function InventorySetupLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const access = useScopedSettingsAccess();
  const onSectionPage = pathname.includes("/settings/inventory-setup/");
  const progressQuery = useInventorySetupProgressQuery({
    organisationSlug: access.organisationSlug,
    venueSlug: access.venueSlug,
    enabled:
      onSectionPage && Boolean(access.organisationSlug && access.venueSlug),
  });

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading inventory setup…
      </div>
    );
  }

  if (!access.canSeeSettingsNav) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view inventory setup for this venue.
        </CardContent>
      </Card>
    );
  }

  const { organisationSlug, venueSlug } = access;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {onSectionPage ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground text-xs font-medium tracking-wide">
                Inventory Setup
              </span>
              <span
                className="text-muted-foreground/50 text-xs select-none"
                aria-hidden
              >
                ·
              </span>
              <InventorySetupSectionNav
                organisationSlug={organisationSlug}
                venueSlug={venueSlug}
              />
            </div>
            {progressQuery.data ? (
              <SetupStepperBanner steps={progressQuery.data.steps} />
            ) : null}
          </div>
          <Separator />
        </>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Setup</h1>
      )}
      {children}
    </div>
  );
}
