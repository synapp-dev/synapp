export type StillPreviewTab = "stand" | "throw" | "land";

/** Keyboard holds for throw-pin hover still (Shift = lineup/throw, A/D = stand/land). */
export type LineupStillHoldKeys = {
  lineupStill: boolean;
  startStill: boolean;
  landStill: boolean;
};

/** Which still frame to show; priority: lineup (throw) → start (stand) → land. */
export function resolveActiveStillPreviewTab(
  keys: LineupStillHoldKeys,
): StillPreviewTab | null {
  if (keys.lineupStill) return "throw";
  if (keys.startStill) return "stand";
  if (keys.landStill) return "land";
  return null;
}

export type LineupStillTimelineFields = {
  videoStartMs: number;
  stillStandMs: number | null;
  stillThrowMs: number | null;
  stillLandMs: number | null;
};

/** Ms used for still preview for the given tab; falls back through editorial fields then trim start. */
export function resolveStillPreviewMs(
  lineup: LineupStillTimelineFields,
  tab: StillPreviewTab,
): number {
  const explicit =
    tab === "throw"
      ? lineup.stillThrowMs
      : tab === "stand"
        ? lineup.stillStandMs
        : lineup.stillLandMs;
  if (explicit != null) return explicit;
  return (
    lineup.stillThrowMs ??
    lineup.stillStandMs ??
    lineup.stillLandMs ??
    lineup.videoStartMs
  );
}
