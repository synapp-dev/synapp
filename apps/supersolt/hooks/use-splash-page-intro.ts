"use client";

import * as React from "react";

import {
  isSplashPageIntroPlayed,
  onSplashPageIntro,
} from "@/lib/splash-intro";

/** Never hold a page hostage if the splash choreography dies mid-flight. */
const SAFETY_MS = 10_000;

/**
 * True once the page content is (about to be) visible. On full document
 * loads with the splash running, flips to true the moment the splash gate
 * starts fading the page in — so entrance animations play in view instead
 * of finishing behind the splash. On client-side navigations (no splash),
 * it's true from the start.
 */
export function useSplashPageIntroDone(): boolean {
  const [done, setDone] = React.useState(true);

  React.useEffect(() => {
    if (isSplashPageIntroPlayed()) return;
    const root = document.documentElement;
    const splashActive =
      root.hasAttribute("data-ss-splash") ||
      root.hasAttribute("data-ss-intro-play");
    if (!splashActive) return;

    setDone(false);
    const finish = () => setDone(true);
    const unsubscribe = onSplashPageIntro(finish);
    const safety = window.setTimeout(finish, SAFETY_MS);
    return () => {
      unsubscribe();
      window.clearTimeout(safety);
    };
  }, []);

  return done;
}
