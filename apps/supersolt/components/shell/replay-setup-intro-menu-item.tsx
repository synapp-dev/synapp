"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";
import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import { getScopedSettingsAccess } from "@/entities/access/scoped-settings-access";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { buildScopedPath } from "@/lib/build-scoped-path";

export function ReplaySetupIntroMenuItem() {
  const { resolvedScope } = useScopedNavigation();

  const organisationSlug = resolvedScope?.organisationSlug ?? "";
  const venueSlug = resolvedScope?.venueSlug ?? "";

  const { data: organisations = [] } = useAccessibleVenueGroupsQuery({
    enabled: Boolean(organisationSlug && venueSlug),
  });

  const access = getScopedSettingsAccess(
    organisations,
    organisationSlug,
    venueSlug,
  );

  if (!resolvedScope || !access.canSeeSettingsNav) {
    return null;
  }

  const href = `${buildScopedPath(
    organisationSlug,
    venueSlug,
    "settings/inventory-setup",
  )}?welcome=1`;

  return (
    <DropdownMenuItem asChild>
      <Link href={href}>
        <Sparkles />
        Replay setup intro
      </Link>
    </DropdownMenuItem>
  );
}
