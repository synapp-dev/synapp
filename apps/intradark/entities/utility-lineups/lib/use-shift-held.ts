import * as React from "react";

import type { LineupStillHoldKeys } from "@/entities/utility-lineups/lib/utility-lineup-still-preview-ms";

export type UtilityLineupPreviewKeys = LineupStillHoldKeys;

/** Shift / A / D holds for throw-pin hover preview (synced globally like game keys). */
export function useUtilityLineupPreviewKeys(): UtilityLineupPreviewKeys {
  const [state, setState] = React.useState<UtilityLineupPreviewKeys>({
    lineupStill: false,
    startStill: false,
    landStill: false,
  });

  React.useEffect(() => {
    const keys = {
      lineupStill: false,
      startStill: false,
      landStill: false,
    };

    const emit = () =>
      setState({
        lineupStill: keys.lineupStill,
        startStill: keys.startStill,
        landStill: keys.landStill,
      });

    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Shift") keys.lineupStill = true;
      else if (e.key === "a" || e.key === "A") keys.startStill = true;
      else if (e.key === "d" || e.key === "D") keys.landStill = true;
      else return;
      emit();
    };

    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") keys.lineupStill = false;
      else if (e.key === "a" || e.key === "A") keys.startStill = false;
      else if (e.key === "d" || e.key === "D") keys.landStill = false;
      else return;
      emit();
    };

    const reset = () => {
      keys.lineupStill = false;
      keys.startStill = false;
      keys.landStill = false;
      emit();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return state;
}

/** Tracks whether Shift is held (global). Resets on window blur so stale state is avoided. */
export function useShiftHeld(): boolean {
  const [held, setHeld] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || e.repeat) return;
      setHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return;
      setHeld(false);
    };
    const reset = () => setHeld(false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return held;
}
