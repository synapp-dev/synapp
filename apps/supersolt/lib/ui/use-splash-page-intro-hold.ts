"use client";

import { useEffect, useState } from "react";
import {
  isSplashPageIntroPlayed,
  onSplashPageIntro,
} from "@/lib/splash-intro";

/**
 * True while the first-load splash is still covering the page (or its exit
 * choreography hasn't reached the page fade-up yet). Entrance animations —
 * card staggers, count-ups, chart draws — should wait while this is true so
 * they play in view once the page actually appears, instead of running
 * unseen behind the splash.
 *
 * Hydration-safe: renders "not held" on the server and the first client
 * render, then flips to held under the opaque splash (invisible to the
 * user). On loads without a splash (client-side navs, skipped routes) it
 * never engages.
 */
export function useSplashPageIntroHold(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (isSplashPageIntroPlayed()) return;
    const root = document.documentElement;
    const splashActive =
      root.hasAttribute("data-ss-splash") ||
      root.hasAttribute("data-ss-intro-play");
    if (!splashActive) return;
    setHeld(true);
    return onSplashPageIntro(() => setHeld(false));
  }, []);

  return held;
}
