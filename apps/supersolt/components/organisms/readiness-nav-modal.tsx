"use client";

import Link from "next/link";

import type { ReadinessBlockerDto, ReadinessModuleId } from "@/entities/readiness/model/types";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

export type ReadinessNavModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
  moduleId: ReadinessModuleId | null;
  blockers: ReadinessBlockerDto[];
  organisationSlug: string;
  venueSlug: string;
};

export function ReadinessNavModal({
  open,
  onOpenChange,
  moduleTitle,
  blockers,
  organisationSlug,
  venueSlug,
}: ReadinessNavModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{moduleTitle} isn&apos;t ready yet</DialogTitle>
          <DialogDescription>
            Complete the steps below to unlock this module for your venue.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {blockers.map((blocker) => (
            <li
              key={blocker.taskId}
              className="rounded-lg border bg-muted/30 p-3 text-sm"
            >
              <p className="font-medium">{blocker.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {blocker.description}
              </p>
              <Button
                asChild
                size="sm"
                className="mt-3"
                variant="secondary"
              >
                <Link
                  href={`/${organisationSlug}/${venueSlug}/${blocker.pathSuffix}`}
                  onClick={() => onOpenChange(false)}
                >
                  {blocker.ctaLabel}
                </Link>
              </Button>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
