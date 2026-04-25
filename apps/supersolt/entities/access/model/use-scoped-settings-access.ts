"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import {
  buildSettingsTabHref,
  getScopedSettingsAccess,
  type ScopedSettingsAccess,
} from "@/entities/access/scoped-settings-access";

export type UseScopedSettingsAccessResult = ScopedSettingsAccess & {
  isLoading: boolean;
  organisationSlug: string;
  venueSlug: string;
  firstAllowedHref: string | null;
};

export function useScopedSettingsAccess(): UseScopedSettingsAccessResult {
  const params = useParams<{ organisation?: string; venue?: string }>();
  const organisationSlug =
    typeof params.organisation === "string" ? params.organisation : "";
  const venueSlug = typeof params.venue === "string" ? params.venue : "";

  const { data: organisations = [], isLoading } = useAccessibleVenueGroupsQuery({
    enabled: Boolean(organisationSlug && venueSlug),
  });

  const access = useMemo(
    () => getScopedSettingsAccess(organisations, organisationSlug, venueSlug),
    [organisations, organisationSlug, venueSlug],
  );

  const firstAllowedHref = useMemo(() => {
    if (!access.firstAllowedSegment || !organisationSlug || !venueSlug) {
      return null;
    }
    return buildSettingsTabHref(
      organisationSlug,
      venueSlug,
      access.firstAllowedSegment,
    );
  }, [access.firstAllowedSegment, organisationSlug, venueSlug]);

  return {
    ...access,
    isLoading,
    organisationSlug,
    venueSlug,
    firstAllowedHref,
  };
}
