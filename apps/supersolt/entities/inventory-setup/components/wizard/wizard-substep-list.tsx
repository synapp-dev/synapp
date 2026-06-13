"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, Lock, TriangleAlert, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type { WizardSubStep } from "@/entities/inventory-setup/model/types";

export type WizardSubStepListProps = {
  subSteps: WizardSubStep[];
  organisationSlug: string;
  venueSlug: string;
  canWrite: boolean;
  devUnlockAll: boolean;
  pendingKey: string | null;
  onAck: (key: string, value: boolean) => void;
};

export function WizardSubStepList({
  subSteps,
  organisationSlug,
  venueSlug,
  canWrite,
  devUnlockAll,
  pendingKey,
  onAck,
}: WizardSubStepListProps) {
  const [dismissedStale, setDismissedStale] = useState<Set<string>>(new Set());

  return (
    <ul className="flex flex-col gap-1.5">
      {subSteps.map((subStep) => {
        const locked = subStep.locked && !devUnlockAll;
        const href = subStep.deepLink
          ? buildScopedPath(organisationSlug, venueSlug, subStep.deepLink)
          : null;
        const showStale = subStep.stale && !dismissedStale.has(subStep.key);

        return (
          <li
            key={subStep.key}
            className={cn(
              "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
              subStep.complete
                ? "border-primary/20 bg-primary/5"
                : locked
                  ? "bg-muted/30 border-dashed"
                  : "bg-background",
            )}
          >
            <div className="flex items-center gap-3">
              <StatusIcon complete={subStep.complete} locked={locked} />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  subStep.complete
                    ? "text-foreground/70"
                    : locked
                      ? "text-muted-foreground"
                      : "text-foreground font-medium",
                )}
              >
                {subStep.label}
              </span>
              <SubStepAction
                subStep={subStep}
                href={href}
                locked={locked}
                canWrite={canWrite}
                pending={pendingKey === subStep.key}
                onAck={onAck}
              />
            </div>

            {showStale ? (
              <div className="bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  {subStep.staleCount} new since you confirmed — worth a review.
                </span>
                {href ? (
                  <Link
                    href={href}
                    className="font-medium underline underline-offset-2"
                  >
                    Review
                  </Link>
                ) : null}
                <button
                  type="button"
                  aria-label="Dismiss"
                  className="opacity-70 hover:opacity-100"
                  onClick={() =>
                    setDismissedStale((prev) =>
                      new Set(prev).add(subStep.key),
                    )
                  }
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StatusIcon({
  complete,
  locked,
}: {
  complete: boolean;
  locked: boolean;
}) {
  if (complete) {
    return (
      <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
        <Check className="h-3 w-3" aria-hidden />
      </span>
    );
  }
  if (locked) {
    return <Lock className="text-muted-foreground h-5 w-5 shrink-0 p-0.5" aria-hidden />;
  }
  return (
    <Circle className="text-muted-foreground/50 h-5 w-5 shrink-0 p-0.5" aria-hidden />
  );
}

function SubStepAction({
  subStep,
  href,
  locked,
  canWrite,
  pending,
  onAck,
}: {
  subStep: WizardSubStep;
  href: string | null;
  locked: boolean;
  canWrite: boolean;
  pending: boolean;
  onAck: (key: string, value: boolean) => void;
}) {
  if (locked) {
    return subStep.lockReason ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground cursor-help text-xs">
            Locked
          </span>
        </TooltipTrigger>
        <TooltipContent>{subStep.lockReason}</TooltipContent>
      </Tooltip>
    ) : null;
  }

  if (subStep.complete) {
    // Completed ack steps can be re-opened; derived steps just show a quiet link.
    if (subStep.kind === "ack" && canWrite) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 text-xs"
          disabled={pending}
          onClick={() => onAck(subStep.key, false)}
        >
          Undo
        </Button>
      );
    }
    return href ? (
      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
        <Link href={href}>Open</Link>
      </Button>
    ) : null;
  }

  if (subStep.kind === "ack") {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={!canWrite || pending}
        onClick={() => onAck(subStep.key, true)}
      >
        {pending ? "Saving…" : "Mark done"}
      </Button>
    );
  }

  return href ? (
    <Button asChild size="sm" className="h-7 text-xs">
      <Link href={href}>
        Go
        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  ) : null;
}
