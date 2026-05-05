import type { SandboxUrlApi } from "@/lib/sandbox/use-sandbox-url-state";

import type { PugPresetId } from "./pug-preset-registry";

/**
 * Milestone 1 scripted walkthrough: advances through early steps with delays.
 * Cancel on manual override is handled in the sidebar (see `pug-sandbox-right-sidebar.tsx`).
 */
export function buildPugQuickTourSteps(api: SandboxUrlApi) {
  return [
    { delayMs: 500, run: () => api.setStepIndex(1) },
    { delayMs: 600, run: () => api.setStepIndex(2) },
    { delayMs: 600, run: () => api.setStepIndex(3) },
  ] as const;
}

export function presetSupportsAutomate(presetId: PugPresetId): boolean {
  return presetId === "quick-tour";
}
