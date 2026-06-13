export type ShiftComplianceRule =
  | "leave_clash"
  | "cert_missing"
  | "cert_expired"
  | "under18_hours"
  | "visa_expired"
  | "rest_gap"
  | "max_hours"
  | "availability"
  | "over_budget"
  | "min_engagement"
  | "pt_pattern";

export type ShiftComplianceTier = "hard_block" | "warn";

export type ShiftComplianceFlag = {
  rule: ShiftComplianceRule;
  tier: ShiftComplianceTier;
  message: string;
};

export type ComplianceShiftContext = {
  staffId: string | null;
  staffName: string;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  dayIndex: number;
  /** Explicit unavailable (availability hint). */
  availabilityKnown: boolean;
  isAvailable: boolean;
  /** Approved leave overlapping this shift date — hard block. */
  onApprovedLeave: boolean;
};

export type ComplianceWeekContext = {
  existingShifts: Array<{
    staffId: string;
    startsAt: string;
    endsAt: string;
    excludeShiftId?: string;
  }>;
  weeklyHoursByStaff: Map<string, number>;
  dayCostCents: number;
  labourBudgetCents: number | null;
};

const MIN_REST_GAP_HOURS = 10;
const MAX_WEEKLY_HOURS = 38;
const MIN_ENGAGEMENT_HOURS = 2;

function hoursBetween(endIso: string, startIso: string): number {
  const end = new Date(endIso).getTime();
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start)) return Infinity;
  return (start - end) / 3600000;
}

function shiftPaidHours(startsAt: string, endsAt: string, breakMinutes: number): number {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (endMs <= startMs) return 0;
  return Math.max(0, (endMs - startMs) / 3600000 - breakMinutes / 60);
}

export function evaluateShiftCompliance(
  shift: ComplianceShiftContext,
  week: ComplianceWeekContext,
): ShiftComplianceFlag[] {
  const flags: ShiftComplianceFlag[] = [];

  if (!shift.staffId) {
    return flags;
  }

  if (shift.onApprovedLeave) {
    flags.push({
      rule: "leave_clash",
      tier: "hard_block",
      message: `${shift.staffName} is on approved leave on ${shift.shiftDate} — cannot roster.`,
    });
  }

  if (shift.availabilityKnown && !shift.isAvailable && !shift.onApprovedLeave) {
    // Availability-only unavailability is handled as warn below, not hard block.
  }

  const paidHours = shiftPaidHours(shift.startsAt, shift.endsAt, shift.breakMinutes);
  if (paidHours > 0 && paidHours < MIN_ENGAGEMENT_HOURS) {
    flags.push({
      rule: "min_engagement",
      tier: "warn",
      message: `Shift is ${paidHours.toFixed(1)}h — award minimum engagement is ${MIN_ENGAGEMENT_HOURS}h.`,
    });
  }

  for (const other of week.existingShifts) {
    if (other.staffId !== shift.staffId) continue;
    if (other.excludeShiftId) continue;

    const gapAfter = hoursBetween(other.endsAt, shift.startsAt);
    const gapBefore = hoursBetween(shift.endsAt, other.startsAt);

    if (gapAfter >= 0 && gapAfter < MIN_REST_GAP_HOURS) {
      flags.push({
        rule: "rest_gap",
        tier: "warn",
        message: `Only ${gapAfter.toFixed(1)}h rest before this shift — standard is ${MIN_REST_GAP_HOURS}h.`,
      });
    }
    if (gapBefore >= 0 && gapBefore < MIN_REST_GAP_HOURS) {
      flags.push({
        rule: "rest_gap",
        tier: "warn",
        message: `Only ${gapBefore.toFixed(1)}h rest after this shift — standard is ${MIN_REST_GAP_HOURS}h.`,
      });
    }
  }

  const priorHours = week.weeklyHoursByStaff.get(shift.staffId) ?? 0;
  const projected = priorHours + paidHours;
  if (projected > MAX_WEEKLY_HOURS) {
    flags.push({
      rule: "max_hours",
      tier: "warn",
      message: `${shift.staffName} would reach ${projected.toFixed(1)}h this week (limit ${MAX_WEEKLY_HOURS}h).`,
    });
  }

  if (
    shift.availabilityKnown &&
    !shift.isAvailable &&
    !shift.onApprovedLeave &&
    flags.every((f) => f.rule !== "leave_clash")
  ) {
    flags.push({
      rule: "availability",
      tier: "warn",
      message: `${shift.staffName} marked unavailable on this day.`,
    });
  }

  return flags;
}

export function hasHardBlock(flags: ShiftComplianceFlag[]): boolean {
  return flags.some((f) => f.tier === "hard_block");
}

export function unresolvedWarnFlags(
  flags: ShiftComplianceFlag[],
  overrideReason: string | undefined,
): ShiftComplianceFlag[] {
  const warns = flags.filter((f) => f.tier === "warn");
  if (warns.length === 0) return [];
  if (overrideReason?.trim()) return [];
  return warns;
}
