"use client";

import * as React from "react";

import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import { LAND_STILL_SLOTS, THROW_STILL_SLOTS } from "../constants";
import { initialTimeline } from "../helpers";
import type { LandStillSlot, ThrowStillSlot } from "../types";

export function useUploadWizardStillsState({
  timeline,
  setTimeline,
}: {
  timeline: UtilityLineupTimelineScrubberValues;
  setTimeline: React.Dispatch<
    React.SetStateAction<UtilityLineupTimelineScrubberValues>
  >;
}) {
  const [throwStillDialogSlot, setThrowStillDialogSlot] =
    React.useState<ThrowStillSlot | null>(null);
  const [throwStillConfirmSlot, setThrowStillConfirmSlot] =
    React.useState<ThrowStillSlot | null>(null);
  const throwStillTimelineSnapshotRef =
    React.useRef<UtilityLineupTimelineScrubberValues>(initialTimeline());
  const throwStillCommitRef = React.useRef(false);
  const skipThrowStillRestoreRef = React.useRef(false);
  const throwStillConfirmSlotRef = React.useRef<ThrowStillSlot | null>(null);

  const [landStillDialogSlot, setLandStillDialogSlot] =
    React.useState<LandStillSlot | null>(null);
  const [landStillConfirmSlot, setLandStillConfirmSlot] =
    React.useState<LandStillSlot | null>(null);
  const landStillTimelineSnapshotRef =
    React.useRef<UtilityLineupTimelineScrubberValues>(initialTimeline());
  const landStillCommitRef = React.useRef(false);
  const skipLandStillRestoreRef = React.useRef(false);
  const landStillConfirmSlotRef = React.useRef<LandStillSlot | null>(null);

  const openThrowStillDialog = React.useCallback(
    (slot: ThrowStillSlot) => {
      throwStillTimelineSnapshotRef.current = { ...timeline };
      throwStillCommitRef.current = false;
      setThrowStillDialogSlot(slot);
    },
    [timeline],
  );

  React.useEffect(() => {
    throwStillConfirmSlotRef.current = throwStillConfirmSlot;
  }, [throwStillConfirmSlot]);

  React.useEffect(() => {
    landStillConfirmSlotRef.current = landStillConfirmSlot;
  }, [landStillConfirmSlot]);

  const openLandStillDialog = React.useCallback(
    (slot: LandStillSlot) => {
      landStillTimelineSnapshotRef.current = { ...timeline };
      landStillCommitRef.current = false;
      setLandStillDialogSlot(slot);
    },
    [timeline],
  );

  const onLandStillDialogOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        if (!landStillCommitRef.current && !skipLandStillRestoreRef.current) {
          setTimeline(landStillTimelineSnapshotRef.current);
        }
        skipLandStillRestoreRef.current = false;
        landStillCommitRef.current = false;
        setLandStillDialogSlot(null);
      }
    },
    [setTimeline],
  );

  const proceedLandStillToConfirm = React.useCallback(() => {
    const slot = landStillDialogSlot;
    if (!slot) return;
    const meta = LAND_STILL_SLOTS.find((s) => s.slot === slot);
    if (!meta || timeline[meta.marker] == null) return;
    skipLandStillRestoreRef.current = true;
    setLandStillConfirmSlot(slot);
    setLandStillDialogSlot(null);
  }, [landStillDialogSlot, timeline]);

  const confirmLandStillFinal = React.useCallback(() => {
    if (!landStillConfirmSlot) return;
    landStillCommitRef.current = true;
    setLandStillConfirmSlot(null);
  }, [landStillConfirmSlot]);

  const onLandStillConfirmOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      if (!landStillCommitRef.current) {
        const slot = landStillConfirmSlotRef.current;
        if (slot) {
          skipLandStillRestoreRef.current = true;
          setLandStillDialogSlot(slot);
        }
      }
      landStillCommitRef.current = false;
      setLandStillConfirmSlot(null);
    }
  }, []);

  const onThrowStillDialogOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        if (!throwStillCommitRef.current && !skipThrowStillRestoreRef.current) {
          setTimeline(throwStillTimelineSnapshotRef.current);
        }
        skipThrowStillRestoreRef.current = false;
        throwStillCommitRef.current = false;
        setThrowStillDialogSlot(null);
      }
    },
    [setTimeline],
  );

  const proceedThrowStillToConfirm = React.useCallback(() => {
    const slot = throwStillDialogSlot;
    if (!slot) return;
    const meta = THROW_STILL_SLOTS.find((s) => s.slot === slot);
    if (!meta || timeline[meta.marker] == null) return;
    skipThrowStillRestoreRef.current = true;
    setThrowStillConfirmSlot(slot);
    setThrowStillDialogSlot(null);
  }, [throwStillDialogSlot, timeline]);

  const confirmThrowStillFinal = React.useCallback(() => {
    if (!throwStillConfirmSlot) return;
    throwStillCommitRef.current = true;
    setThrowStillConfirmSlot(null);
  }, [throwStillConfirmSlot]);

  const onThrowStillConfirmOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      if (!throwStillCommitRef.current) {
        const slot = throwStillConfirmSlotRef.current;
        if (slot) {
          skipThrowStillRestoreRef.current = true;
          setThrowStillDialogSlot(slot);
        }
      }
      throwStillCommitRef.current = false;
      setThrowStillConfirmSlot(null);
    }
  }, []);

  const reset = React.useCallback(() => {
    setThrowStillDialogSlot(null);
    setThrowStillConfirmSlot(null);
    setLandStillDialogSlot(null);
    setLandStillConfirmSlot(null);
  }, []);

  return {
    throwStillDialogSlot,
    throwStillConfirmSlot,
    landStillDialogSlot,
    landStillConfirmSlot,
    openThrowStillDialog,
    openLandStillDialog,
    onLandStillDialogOpenChange,
    proceedLandStillToConfirm,
    confirmLandStillFinal,
    onLandStillConfirmOpenChange,
    onThrowStillDialogOpenChange,
    proceedThrowStillToConfirm,
    confirmThrowStillFinal,
    onThrowStillConfirmOpenChange,
    reset,
  };
}
