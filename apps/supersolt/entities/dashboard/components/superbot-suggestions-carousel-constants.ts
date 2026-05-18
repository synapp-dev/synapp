export const AUTO_ADVANCE_MS = 10_000;
/** Stagger step indices (icon → title → body + context → footer). */
export const SLIDE_STAGGER_ICON = 0;
export const SLIDE_STAGGER_TITLE = 1;
export const SLIDE_STAGGER_BODY = 2;
export const SLIDE_STAGGER_FOOTER = 3;
/** Gap between staggered steps (ms). */
export const SLIDE_EXIT_STAGGER_MS = 90;
/** Longest per-step animation (matches `*-fade-out-slow` in globals). */
export const SLIDE_EXIT_ITEM_MS = 420;
/** Wait for staggered exit before advancing (last step start + animation + buffer). */
export const SLIDE_EXIT_FADE_MS =
  SLIDE_EXIT_STAGGER_MS * SLIDE_STAGGER_FOOTER + SLIDE_EXIT_ITEM_MS + 50;
export const PROGRESS_TICK_MS = 16;
export const STREAM_CHARS_PER_TICK = 2;
export const STREAM_TICK_MS = 25;

export function easeInOutCubic(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
