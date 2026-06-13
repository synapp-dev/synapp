"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { ReadinessModuleId } from "@/entities/readiness/model/types";
import {
  usePatchVenueReadinessMutation,
  useVenueReadinessQuery,
} from "@/entities/readiness/model/use-venue-readiness-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

export type ReadinessUnlockCelebrationProps = {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
};

export function ReadinessUnlockCelebration({
  organisationSlug,
  venueSlug,
  enabled = true,
}: ReadinessUnlockCelebrationProps) {
  const { data: readiness } = useVenueReadinessQuery({
    organisationSlug,
    venueSlug,
    enabled,
  });
  const patch = usePatchVenueReadinessMutation({ organisationSlug, venueSlug });
  const shownThisSessionRef = useRef<Set<ReadinessModuleId>>(new Set());

  const celebration = readiness?.pendingUnlockCelebrations[0] ?? null;
  const open = Boolean(
    celebration && !shownThisSessionRef.current.has(celebration.moduleId),
  );

  useEffect(() => {
    if (!celebration) {
      return;
    }
    shownThisSessionRef.current.add(celebration.moduleId);
  }, [celebration]);

  if (!celebration) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void patch.mutateAsync({
            action: "mark_unlock_seen",
            moduleId: celebration.moduleId,
          });
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You can now access {celebration.title}</DialogTitle>
          <DialogDescription>
            Your venue is configured enough to use {celebration.title.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() =>
              void patch.mutateAsync({
                action: "mark_unlock_seen",
                moduleId: celebration.moduleId,
              })
            }
          >
            Got it
          </Button>
          <Button asChild>
            <Link
              href={`/${organisationSlug}/${venueSlug}/${celebration.pathSuffix}`}
              onClick={() =>
                void patch.mutateAsync({
                  action: "mark_unlock_seen",
                  moduleId: celebration.moduleId,
                })
              }
            >
              {celebration.ctaLabel}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
