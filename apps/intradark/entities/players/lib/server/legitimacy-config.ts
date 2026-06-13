/** When false, skip recompute and hide legitimacy UI. Default: enabled. */
export function isLegitimacyScoringEnabled(): boolean {
  const v = process.env.LEGITIMACY_SCORING_ENABLED;
  if (v == null || v === "") return true;
  return v !== "false" && v !== "0";
}
