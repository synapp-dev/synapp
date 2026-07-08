"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { StorageLocationsSection } from "@/entities/stock-counts/components/storage-locations-section";
import { buildScopedPath } from "@/lib/build-scoped-path";

export function StorageLocationsPageClient() {
  const access = useScopedSettingsAccess();
  const router = useRouter();

  if (access.isLoading || !access.organisationSlug || !access.venueSlug) {
    return null;
  }

  const { organisationSlug, venueSlug } = access;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            router.push(
              buildScopedPath(
                organisationSlug,
                venueSlug,
                "settings/inventory-setup/storage/wizard",
              ),
            )
          }
        >
          <Sparkles className="size-4" aria-hidden />
          Count opening stock
        </Button>
      </div>
      <StorageLocationsSection
        organisationSlug={organisationSlug}
        venueSlug={venueSlug}
        canEdit={access.canSeePermissions || access.canSeeOrganisation}
        hidePageHeader
      />
    </div>
  );
}
