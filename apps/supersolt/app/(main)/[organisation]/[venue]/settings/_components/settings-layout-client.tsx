"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plug } from "lucide-react";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import {
  buildSettingsTabHref,
} from "@/entities/access/scoped-settings-access";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

function tabClassName(active: boolean) {
  return cn(
    "text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors",
    active &&
      "bg-background text-foreground shadow-sm border-input dark:bg-input/30",
  );
}

function usesSettingsTabs(pathname: string): boolean {
  return (
    pathname.endsWith("/settings") ||
    pathname.includes("/settings/permissions") ||
    pathname.includes("/settings/organisation") ||
    pathname.includes("/settings/venue") ||
    pathname.includes("/settings/award-rates") ||
    pathname.includes("/settings/integrations")
  );
}

export function SettingsLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const access = useScopedSettingsAccess();

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading settings…
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
          You do not have permission to view settings for this venue.
        </CardContent>
      </Card>
    );
  }

  const { organisationSlug, venueSlug } = access;
  const integrationsHref = buildScopedPath(
    organisationSlug,
    venueSlug,
    "settings/integrations",
  );
  const onIntegrations = pathname.includes("/settings/integrations");
  const showSettingsTabs = usesSettingsTabs(pathname);

  if (!showSettingsTabs) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Permissions, organisation, venue, award rates, and integrations.
        </p>
      </div>
      <nav
        className="bg-muted text-muted-foreground inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
        aria-label="Settings sections"
      >
        {access.canSeePermissions ? (
          <Link
            href={buildSettingsTabHref(organisationSlug, venueSlug, "permissions")}
            className={tabClassName(pathname.endsWith("/settings/permissions"))}
          >
            Permissions
          </Link>
        ) : null}
        {access.canSeeOrganisation ? (
          <Link
            href={buildSettingsTabHref(organisationSlug, venueSlug, "organisation")}
            className={tabClassName(pathname.endsWith("/settings/organisation"))}
          >
            Organisation
          </Link>
        ) : null}
        {access.canSeeVenue ? (
          <Link
            href={buildSettingsTabHref(organisationSlug, venueSlug, "venue")}
            className={tabClassName(pathname.endsWith("/settings/venue"))}
          >
            Venue
          </Link>
        ) : null}
        {access.canSeeAwardRates ? (
          <Link
            href={buildScopedPath(organisationSlug, venueSlug, "settings/award-rates")}
            className={tabClassName(pathname.includes("/settings/award-rates"))}
          >
            Award rates
          </Link>
        ) : null}
        {access.canSeePermissions ? (
          <Link
            href={integrationsHref}
            className={cn(tabClassName(onIntegrations), "inline-flex items-center gap-1.5")}
          >
            <Plug className="size-3.5 shrink-0" aria-hidden />
            Integrations
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
