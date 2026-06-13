/** Default hospitality award code. */
import { computeShiftCostFromBuiltin } from "@/server/workforce/award/award.service";
import type { ShiftCostInput, ShiftCostResult } from "@/server/workforce/award/award-types";

export const DEFAULT_AWARD_CODE = "MA000119";

/** Default hourly rate (cents) when employee pay rate is unknown. */
export const DEFAULT_HOURLY_RATE_CENTS = 2800;

export type { ShiftCostInput, ShiftCostResult };

/** Sync shift cost using built-in rule packs (tests + legacy callers). */
export function computeShiftCost(
  input: ShiftCostInput & {
    awardCode?: string;
    classificationGrade?: string;
    employmentType?: ShiftCostInput["employmentType"];
  },
): ShiftCostResult {
  return computeShiftCostFromBuiltin(input.awardCode ?? DEFAULT_AWARD_CODE, {
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    breakMinutes: input.breakMinutes,
    hourlyRateCents: input.hourlyRateCents,
    timezone: input.timezone,
    employmentType: input.employmentType ?? "casual",
    classificationGrade: input.classificationGrade ?? "2",
    asOfDate: input.asOfDate,
  });
}

/** Deterministic fallback rate from staff id when pay rate not yet on People records. */
export function fallbackHourlyRateCents(staffId: string): number {
  let h = 0;
  for (let i = 0; i < staffId.length; i += 1) {
    h = (Math.imul(31, h) + staffId.charCodeAt(i)) | 0;
  }
  return DEFAULT_HOURLY_RATE_CENTS + (Math.abs(h) % 15) * 100;
}
