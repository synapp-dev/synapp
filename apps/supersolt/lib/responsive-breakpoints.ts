/**
 * Viewport breakpoints for the app shell's responsive behaviour.
 *
 * AGENT_DOCK_BREAKPOINT — below this width the Superbot mascot rail is hidden,
 * the agent chat opens as an overlay sheet, and the header shows the labelled
 * "Superbot" trigger. Keep in sync with the Tailwind `xl` classes in
 * `AppHeader` (xl = 1280px).
 *
 * SIDEBAR_AUTO_COLLAPSE_BREAKPOINT — below this width the left navigation
 * sidebar auto-collapses to its icon rail so the content column keeps room
 * to breathe.
 */
export const AGENT_DOCK_BREAKPOINT = 1280;
export const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 1440;
