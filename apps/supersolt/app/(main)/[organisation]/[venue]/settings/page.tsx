"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function SettingsIndexPage() {
  const router = useRouter();
  const access = useScopedSettingsAccess();

  useEffect(() => {
    if (access.isLoading) {
      return;
    }
    if (access.firstAllowedHref) {
      router.replace(access.firstAllowedHref);
    }
  }, [access.firstAllowedHref, access.isLoading, router]);

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!access.canSeeSettingsNav || !access.firstAllowedHref) {
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

  return (
    <div className="text-muted-foreground text-sm" aria-busy="true">
      Opening settings…
    </div>
  );
}
