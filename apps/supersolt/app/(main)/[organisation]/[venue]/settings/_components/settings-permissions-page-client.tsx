"use client";

import Link from "next/link";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { useSettingsSectionRedirect } from "@/app/(main)/[organisation]/[venue]/settings/_components/use-settings-section-redirect";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function SettingsPermissionsPageClient() {
  const access = useScopedSettingsAccess();
  const allowed = access.canSeePermissions;
  const { showForbidden, isRedirecting } = useSettingsSectionRedirect(access, allowed);

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading…
      </div>
    );
  }

  if (showForbidden) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to manage permissions for this organisation.
        </CardContent>
      </Card>
    );
  }

  if (isRedirecting) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Redirecting…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          Control who can access each venue and what they can do. Detailed staff and role
          management lives in Workforce.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Granular permission controls will appear here. For now, use People to invite staff
          and assign roles per venue.
        </p>
        <Button asChild variant="secondary" className="w-fit">
          <Link
            href={buildScopedPath(
              access.organisationSlug,
              access.venueSlug,
              "workforce/people",
            )}
          >
            Open People
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
