"use client";

import { Crosshair } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import { THROW_STILL_SLOTS } from "../constants";
import { ThrowStillSlotTemplate } from "../shared-components";
import { useUploadWizard } from "../upload-wizard-context";

export function ThrowStep() {
  const {
    enqueueLoading,
    throwNorm,
    throwLabel,
    openThrowRadarForPick,
    openThrowStillDialog,
    throwRadarPositionComplete,
    file,
    filePreviewUrl,
    timeline,
  } = useUploadWizard();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="w-full min-w-0 space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">
          Throw radar position
        </Label>
        <div className="flex w-full min-w-0 items-center gap-2">
          <Button
            type="button"
            variant={throwNorm ? "default" : "outline"}
            className="h-11 w-1/4 min-w-0 shrink-0 justify-center gap-2 px-2"
            onClick={() => openThrowRadarForPick()}
            disabled={enqueueLoading}
          >
            <Crosshair className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {throwNorm ? "Select new radar position" : "Select on radar"}
            </span>
          </Button>
          <Input
            id="throw-label-display"
            readOnly
            value={throwLabel}
            disabled
            placeholder="Select position on radar first"
            className="min-w-0 flex-1"
            aria-label="Throw spot label"
          />
        </div>
      </div>
      {throwRadarPositionComplete ? (
        <div className="w-full min-w-0 space-y-2">
          <Label className="text-xs font-normal text-muted-foreground">
            Video stills
          </Label>
          <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:gap-3">
            {THROW_STILL_SLOTS.map(({ slot, marker, caption }) => (
              <button
                key={slot}
                type="button"
                aria-label={`${caption}. Click to choose or edit the freeze frame.`}
                onClick={() => openThrowStillDialog(slot)}
                disabled={enqueueLoading || !file}
                className={cn(
                  "flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-2 text-left transition-colors",
                  "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <ThrowStillSlotTemplate
                  videoUrl={filePreviewUrl}
                  timeMs={timeline[marker]}
                />
                <span className="text-muted-foreground text-center text-[11px] leading-tight sm:text-xs">
                  {caption}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
