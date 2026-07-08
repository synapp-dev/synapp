/**
 * One-shot handoff flag from the Xero import completion to the suppliers page,
 * so the latter can offer the guided supplier walkthrough. Uses sessionStorage
 * because query params don't survive navigation on the scoped setup routes.
 */
const KEY = "supersolt:supplier-setup-complete";

export function markSupplierSetupComplete(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // sessionStorage unavailable (SSR / privacy mode) — the prompt just won't show.
  }
}

/** Reads and clears the flag in one go, so it only fires once. */
export function consumeSupplierSetupComplete(): boolean {
  try {
    const hit = window.sessionStorage.getItem(KEY) === "1";
    if (hit) window.sessionStorage.removeItem(KEY);
    return hit;
  } catch {
    return false;
  }
}
