"use client";

import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import {
  UtilityLineupVideoTimelineScrubber,
} from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import { LAND_STILL_SLOTS, THROW_STILL_SLOTS } from "./constants";
import {
  landRadarThrowLineStroke,
  landRadarTravelPulseStroke,
  landStillPickDescription,
  throwRadarPinPalette,
  throwStillPickDescription,
} from "./helpers";
import { ThrowStillCapturedFrame } from "./shared-components";
import { useUploadWizard } from "./upload-wizard-context";

export function UploadWizardDialogs() {
  const {
    radarDialogKind,
    closeRadarDialog,
    onDialogRadarClick,
    dialogRadarImgRef,
    selectedMap,
    initialRadarImageUrl,
    initialDisplayName,
    recomputeDialogRadarLayout,
    throwNorm,
    pendingRadarNorm,
    landRadarOverlaySvgPoint,
    side,
    prefersReducedMotion,
    landRadarThrowPinStyle,
    dialogPinOverlayStyle,
    handleRadarDialogOk,
    throwSpotNamingOpen,
    setThrowSpotNamingOpen,
    throwSpotLabelDraft,
    setThrowSpotLabelDraft,
    handleThrowSpotNamingConfirm,
    landSpotNamingOpen,
    setLandSpotNamingOpen,
    landSpotLabelDraft,
    setLandSpotLabelDraft,
    handleLandSpotNamingConfirm,
    throwStillDialogSlot,
    onThrowStillDialogOpenChange,
    throwStillDialogMeta,
    grenadeLabelForThrowStills,
    filePreviewUrl,
    timeline,
    setTimeline,
    enqueueLoading,
    file,
    proceedThrowStillToConfirm,
    throwStillConfirmSlot,
    onThrowStillConfirmOpenChange,
    throwStillConfirmMeta,
    confirmThrowStillFinal,
    landStillDialogSlot,
    onLandStillDialogOpenChange,
    landStillDialogMeta,
    proceedLandStillToConfirm,
    landStillConfirmSlot,
    onLandStillConfirmOpenChange,
    landStillConfirmMeta,
    confirmLandStillFinal,
  } = useUploadWizard();

  return (
    <>
    <Dialog
      open={radarDialogKind !== null}
      onOpenChange={(next) => {
        if (!next) closeRadarDialog();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {radarDialogKind === "throw"
              ? "Throw position"
              : radarDialogKind === "land"
                ? "Land position"
                : "Radar"}
          </DialogTitle>
          <DialogDescription>
            {radarDialogKind === "throw"
              ? "Click the map to place the pin. OK continues to name this spot."
              : radarDialogKind === "land"
                ? "Your throw spot is shown with the animated path once you place the land pin — same as on the map. OK continues to name this spot."
                : "Click the radar to place the pin, then confirm with OK."}
          </DialogDescription>
        </DialogHeader>
        <div
          role="presentation"
          className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-border"
          onClick={onDialogRadarClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={dialogRadarImgRef}
            src={selectedMap?.radarImageUrl ?? initialRadarImageUrl}
            alt={`${selectedMap?.displayName ?? initialDisplayName} radar`}
            className="pointer-events-none block h-auto w-full max-h-[min(48vh,420px)] object-contain"
            draggable={false}
            onLoad={() => {
              recomputeDialogRadarLayout();
            }}
          />
          {radarDialogKind === "land" &&
          throwNorm &&
          pendingRadarNorm ? (
            <div
              className="pointer-events-none absolute inset-0 z-[8]"
              aria-hidden
            >
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <style>
                    {`
                    @keyframes intradarkUtilityDashTravel {
                      to { stroke-dashoffset: -2.2; }
                    }
                    .intradark-utility-throw-line {
                      stroke-dashoffset: 0;
                      animation: intradarkUtilityDashTravel 1.15s linear infinite;
                    }
                    @media (prefers-reduced-motion: reduce) {
                      .intradark-utility-throw-line { animation: none; }
                    }
                  `}
                  </style>
                </defs>
                {(() => {
                  const from = landRadarOverlaySvgPoint(
                    throwNorm.x,
                    throwNorm.y,
                  );
                  const to = landRadarOverlaySvgPoint(
                    pendingRadarNorm.x,
                    pendingRadarNorm.y,
                  );
                  const x1 = from.x;
                  const y1 = from.y;
                  const x2 = to.x;
                  const y2 = to.y;
                  const segLen = Math.hypot(x2 - x1, y2 - y1) || 0.01;
                  const pulseLen = Math.max(1.6, segLen * 0.13);
                  const gapLen = segLen * 2.75;
                  const travelPeriod = pulseLen + gapLen;
                  return (
                    <g>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={landRadarTravelPulseStroke(side)}
                        strokeWidth={0.58}
                        strokeDasharray={`${pulseLen} ${gapLen}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        opacity={0.92}
                      >
                        {!prefersReducedMotion ? (
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to={String(-travelPeriod)}
                            dur="2.25s"
                            repeatCount="indefinite"
                          />
                        ) : null}
                      </line>
                      <line
                        className="intradark-utility-throw-line"
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={landRadarThrowLineStroke(side)}
                        strokeWidth={0.35}
                        strokeDasharray="1.2 1"
                        strokeLinecap="round"
                        opacity={0.88}
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>
          ) : null}
          {radarDialogKind === "land" &&
          throwNorm &&
          landRadarThrowPinStyle ? (
            <div
              className="pointer-events-none absolute z-10 flex h-0 w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={landRadarThrowPinStyle}
            >
              {(() => {
                const pal = throwRadarPinPalette(side);
                return (
                  <>
                    <span
                      className={cn(
                        "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                        pal.ring,
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                        pal.ring,
                      )}
                      style={{ animationDelay: "1.05s" }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "relative z-10 inline-flex size-3 shrink-0 rounded-full border-2",
                        pal.core,
                      )}
                    />
                  </>
                );
              })()}
            </div>
          ) : null}
          {dialogPinOverlayStyle && radarDialogKind === "land" ? (
            <span
              className="border-background absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-sky-400 shadow"
              style={dialogPinOverlayStyle}
            />
          ) : null}
          {dialogPinOverlayStyle && radarDialogKind === "throw"
            ? (() => {
                const pal = throwRadarPinPalette(side);
                return (
                  <div
                    className="pointer-events-none absolute z-10 flex h-0 w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={dialogPinOverlayStyle}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                        pal.ring,
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                        pal.ring,
                      )}
                      style={{ animationDelay: "1.05s" }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "relative z-10 inline-flex size-3 shrink-0 rounded-full border-2",
                        pal.core,
                      )}
                    />
                  </div>
                );
              })()
            : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={closeRadarDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!pendingRadarNorm}
            onClick={handleRadarDialogOk}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={throwSpotNamingOpen}
      onOpenChange={(next) => {
        if (!next) setThrowSpotNamingOpen(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name this throw spot</DialogTitle>
          <DialogDescription>
            What is the closest name you would use for this spot in-game? Use
            the callout or landmark players would recognize.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="throw-spot-label-draft" className="sr-only">
            Spot label
          </Label>
          <Input
            id="throw-spot-label-draft"
            value={throwSpotLabelDraft}
            onChange={(e) => setThrowSpotLabelDraft(e.target.value)}
            placeholder="e.g. Top mid, Dumpster, CT spawn"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && throwSpotLabelDraft.trim()) {
                e.preventDefault();
                handleThrowSpotNamingConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setThrowSpotNamingOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!throwSpotLabelDraft.trim()}
            onClick={handleThrowSpotNamingConfirm}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={landSpotNamingOpen}
      onOpenChange={(next) => {
        if (!next) setLandSpotNamingOpen(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name this land spot</DialogTitle>
          <DialogDescription>
            What is the closest name for where this utility lands? Use the
            callout or landmark players would recognize.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="land-spot-label-draft" className="sr-only">
            Land spot label
          </Label>
          <Input
            id="land-spot-label-draft"
            value={landSpotLabelDraft}
            onChange={(e) => setLandSpotLabelDraft(e.target.value)}
            placeholder="e.g. Back site, Default plant, Fountain"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && landSpotLabelDraft.trim()) {
                e.preventDefault();
                handleLandSpotNamingConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLandSpotNamingOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!landSpotLabelDraft.trim()}
            onClick={handleLandSpotNamingConfirm}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={throwStillDialogSlot !== null}
      onOpenChange={onThrowStillDialogOpenChange}
    >
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {throwStillDialogMeta?.title ?? "Pick a frame"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pause the video with the player controls, nudge the timestamp if
            needed, then confirm. You will review a screenshot next.
          </DialogDescription>
        </DialogHeader>
        {throwStillDialogMeta && throwStillDialogSlot ? (
          <UtilityLineupVideoTimelineScrubber
            variant="single"
            singleMarkerKey={throwStillDialogMeta.marker}
            sectionDescription={throwStillPickDescription(
              throwStillDialogSlot,
              grenadeLabelForThrowStills,
            )}
            videoSrc={filePreviewUrl}
            values={timeline}
            setTimeline={setTimeline}
            disabled={enqueueLoading || !file}
            compactPickFrameControls
            hideSingleVariantHeading
            className="border-0 p-0 shadow-none"
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onThrowStillDialogOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !throwStillDialogMeta ||
              timeline[throwStillDialogMeta.marker] == null
            }
            onClick={proceedThrowStillToConfirm}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={throwStillConfirmSlot !== null}
      onOpenChange={onThrowStillConfirmOpenChange}
    >
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {throwStillConfirmMeta?.title
              ? `Confirm — ${throwStillConfirmMeta.title}`
              : "Confirm frame"}
          </DialogTitle>
          <DialogDescription>
            This is the freeze frame we&apos;ll use. If you&apos;re happy with
            it, click OK. Otherwise go back to choose a different moment.
          </DialogDescription>
        </DialogHeader>
        {throwStillConfirmMeta &&
        filePreviewUrl &&
        typeof timeline[throwStillConfirmMeta.marker] === "number" ? (
          <ThrowStillCapturedFrame
            videoUrl={filePreviewUrl}
            timeMs={timeline[throwStillConfirmMeta.marker]!}
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onThrowStillConfirmOpenChange(false)}
          >
            Back
          </Button>
          <Button type="button" onClick={confirmThrowStillFinal}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={landStillDialogSlot !== null}
      onOpenChange={onLandStillDialogOpenChange}
    >
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {landStillDialogMeta?.title ?? "Pick a frame"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pause the video with the player controls, nudge the timestamp if
            needed, then confirm. You will review a screenshot next.
          </DialogDescription>
        </DialogHeader>
        {landStillDialogMeta && landStillDialogSlot ? (
          <UtilityLineupVideoTimelineScrubber
            variant="single"
            singleMarkerKey={landStillDialogMeta.marker}
            sectionDescription={landStillPickDescription(
              landStillDialogSlot,
              grenadeLabelForThrowStills,
            )}
            videoSrc={filePreviewUrl}
            values={timeline}
            setTimeline={setTimeline}
            disabled={enqueueLoading || !file}
            compactPickFrameControls
            hideSingleVariantHeading
            className="border-0 p-0 shadow-none"
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onLandStillDialogOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !landStillDialogMeta ||
              timeline[landStillDialogMeta.marker] == null
            }
            onClick={proceedLandStillToConfirm}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={landStillConfirmSlot !== null}
      onOpenChange={onLandStillConfirmOpenChange}
    >
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {landStillConfirmMeta?.title
              ? `Confirm — ${landStillConfirmMeta.title}`
              : "Confirm frame"}
          </DialogTitle>
          <DialogDescription>
            This is the freeze frame we&apos;ll use. If you&apos;re happy with
            it, click OK. Otherwise go back to choose a different moment.
          </DialogDescription>
        </DialogHeader>
        {landStillConfirmMeta &&
        filePreviewUrl &&
        typeof timeline[landStillConfirmMeta.marker] === "number" ? (
          <ThrowStillCapturedFrame
            videoUrl={filePreviewUrl}
            timeMs={timeline[landStillConfirmMeta.marker]!}
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onLandStillConfirmOpenChange(false)}
          >
            Back
          </Button>
          <Button type="button" onClick={confirmLandStillFinal}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
