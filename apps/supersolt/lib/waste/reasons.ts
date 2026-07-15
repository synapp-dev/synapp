/**
 * Waste reason taxonomy, shared by the waste service (validation) and the
 * client UI (pills / filters). Order here is display order in the quick-log
 * modal.
 *
 * Migration 20260712090000_waste_module_spec.sql expands the DB check
 * constraint to the full Notion-spec taxonomy (customer_return, overcooked,
 * dropped, over_portioning, expired, training, end_of_day). Until it is
 * applied to supabase-fclph, only the reasons below are insertable.
 */
export const WASTE_REASONS = [
  { value: "spoilage", label: "Spoilage" },
  { value: "prep_error", label: "Preparation error" },
  { value: "breakage", label: "Dropped / breakage" },
  { value: "theft", label: "Theft / unknown" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
] as const;

export type WasteReason = (typeof WASTE_REASONS)[number]["value"];

export const WASTE_REASON_VALUES = WASTE_REASONS.map((r) => r.value);

export const WASTE_REASON_LABEL: Record<string, string> = Object.fromEntries(
  WASTE_REASONS.map((r) => [r.value, r.label]),
);

export function isWasteReason(value: string): value is WasteReason {
  return (WASTE_REASON_VALUES as string[]).includes(value);
}
