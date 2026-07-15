/**
 * Handshake between the app sidebar and the first-load splash
 * (components/branding/supersolt-splash.tsx).
 *
 * The sidebar calls `markSplashSidebarReady()` once its data (scope, venues,
 * nav items) has resolved; the splash gate holds the splash until then (with
 * a max-hold fallback for routes that never mount a sidebar, e.g. login),
 * and only then plays the exit + sidebar-intro choreography.
 */

let sidebarReady = false;
const listeners = new Set<() => void>();

export function markSplashSidebarReady() {
  if (sidebarReady) return;
  sidebarReady = true;
  for (const listener of listeners) listener();
}

export function isSplashSidebarReady() {
  return sidebarReady;
}

/** Subscribe to the ready signal. Returns an unsubscribe function. */
export function onSplashSidebarReady(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Second handshake, the other way: the gate announces the moment the page
// content ([data-slot="sidebar-inset"]) starts fading up, so pages can hold
// their own entrance animations (card staggers, count-ups, chart draws)
// until they are actually visible instead of playing behind the splash.
let pageIntroPlayed = false;
const pageIntroListeners = new Set<() => void>();

export function markSplashPageIntro() {
  if (pageIntroPlayed) return;
  pageIntroPlayed = true;
  for (const listener of pageIntroListeners) listener();
}

export function isSplashPageIntroPlayed() {
  return pageIntroPlayed;
}

/** Subscribe to the page-intro moment. Returns an unsubscribe function. */
export function onSplashPageIntro(listener: () => void) {
  pageIntroListeners.add(listener);
  return () => {
    pageIntroListeners.delete(listener);
  };
}
