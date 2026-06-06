"use client";

import * as React from "react";
import { track } from "@vercel/analytics/react";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";

import type { UtilityMapPickerOption } from "./types";
import { UploadWizardProvider } from "./upload-wizard-context";
import { UploadWizardSheetShell } from "./upload-wizard-sheet-shell";

export type { UtilityMapPickerOption } from "./types";

export function UtilityLineupUploadButton({
  maps,
  uploadGate,
  mapSlug: initialMapSlug,
  displayName: initialDisplayName,
  radarImageUrl: initialRadarImageUrl,
  authUserId,
}: {
  maps: UtilityMapPickerOption[];
  uploadGate: { canUpload: boolean; message: string | null };
  mapSlug: string;
  displayName: string;
  radarImageUrl: string;
  authUserId: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  if (uploadGate.canUpload) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setOpen(true);
            void track("utility_upload_wizard_opened", {
              map_slug: initialMapSlug,
            });
          }}
        >
          Upload lineup
        </Button>
        <UtilityLineupUploadWizardSheet
          open={open}
          onOpenChange={setOpen}
          maps={maps}
          initialMapSlug={initialMapSlug}
          initialDisplayName={initialDisplayName}
          initialRadarImageUrl={initialRadarImageUrl}
        />
      </>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      asChild
      title={uploadGate.message ?? undefined}
    >
      <Link href={authUserId ? "/dashboard" : "/auth"}>
        {authUserId ? "Upload locked" : "Sign in to upload"}
      </Link>
    </Button>
  );
}

function UtilityLineupUploadWizardSheet({
  open,
  onOpenChange,
  maps,
  initialMapSlug,
  initialDisplayName,
  initialRadarImageUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maps: UtilityMapPickerOption[];
  initialMapSlug: string;
  initialDisplayName: string;
  initialRadarImageUrl: string;
}) {
  return (
    <UploadWizardProvider
      open={open}
      onOpenChange={onOpenChange}
      maps={maps}
      initialMapSlug={initialMapSlug}
      initialDisplayName={initialDisplayName}
      initialRadarImageUrl={initialRadarImageUrl}
    >
      <UploadWizardSheetShell />
    </UploadWizardProvider>
  );
}
