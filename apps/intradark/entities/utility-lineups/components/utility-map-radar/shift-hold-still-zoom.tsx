"use client";

import * as React from "react";

import { LineupReticlesOverlay } from "./lineup-reticles-overlay";

const SHIFT_STILL_ZOOM_DELAY_MS = 500;
const SHIFT_STILL_ZOOM_SCALE = 3;
const SHIFT_STILL_ZOOM_TRANSITION_MS = 500;
/** After zoom is active, wait this long (still holding Shift) before drawing lineup reticles. */
const SHIFT_STILL_RETICLE_DELAY_AFTER_ZOOM_MS = 2000;

/** After Shift is held: optional delay, then ease-scale still preview from center (“zoom in ~50%”). */
export function ShiftHoldStillZoom({
  active,
  prefersReducedMotion,
  reticlesEnabled = true,
  instantTiming = false,
  children,
}: {
  active: boolean;
  prefersReducedMotion: boolean;
  /** When false, lineup grid overlay is never shown (fullscreen toggle). */
  reticlesEnabled?: boolean;
  /**
   * Fullscreen manual toggles: no intro delays. When false, use delayed zoom + reticle sequence
   * (e.g. first paint after opening the dialog).
   */
  instantTiming?: boolean;
  children: React.ReactNode;
}) {
  const [zoomEngaged, setZoomEngaged] = React.useState(false);
  const [reticlesVisible, setReticlesVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!active) {
      setZoomEngaged(false);
      return;
    }
    if (instantTiming || prefersReducedMotion) {
      setZoomEngaged(true);
      return;
    }
    const id = window.setTimeout(
      () => setZoomEngaged(true),
      SHIFT_STILL_ZOOM_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [active, prefersReducedMotion, instantTiming]);

  React.useLayoutEffect(() => {
    if (!active || !zoomEngaged || !reticlesEnabled) {
      setReticlesVisible(false);
      return;
    }
    if (instantTiming) {
      setReticlesVisible(true);
      return;
    }
    const id = window.setTimeout(() => {
      setReticlesVisible(true);
    }, SHIFT_STILL_RETICLE_DELAY_AFTER_ZOOM_MS);
    return () => clearTimeout(id);
  }, [active, zoomEngaged, reticlesEnabled, instantTiming]);

  const scale = active && zoomEngaged ? SHIFT_STILL_ZOOM_SCALE : 1;

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div
        className="flex h-full w-full origin-center items-center justify-center will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transition:
            prefersReducedMotion || !active
              ? undefined
              : `transform ${
                  instantTiming ? 200 : SHIFT_STILL_ZOOM_TRANSITION_MS
                }ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <div className="h-full w-full min-h-0 min-w-0">{children}</div>
      </div>
      {reticlesVisible && reticlesEnabled ? (
        <LineupReticlesOverlay prefersReducedMotion={prefersReducedMotion} />
      ) : null}
    </div>
  );
}
