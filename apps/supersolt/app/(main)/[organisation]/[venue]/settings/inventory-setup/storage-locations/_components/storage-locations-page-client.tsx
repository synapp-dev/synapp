"use client";

import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { StorageLocationsSection } from "@/entities/stock-counts/components/storage-locations-section";

export function StorageLocationsPageClient() {
  const access = useScopedSettingsAccess();

  if (access.isLoading || !access.organisationSlug || !access.venueSlug) {
    return null;
  }

  return (
    <StorageLocationsSection
      organisationSlug={access.organisationSlug}
      venueSlug={access.venueSlug}
      canEdit={access.canSeePermissions || access.canSeeOrganisation}
      hidePageHeader
    />
  );
}
