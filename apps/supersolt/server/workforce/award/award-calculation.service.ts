import { AwardServiceError } from "@/server/workforce/award/award-errors";
import type {
  AwardRulePack,
  EmploymentTypeScope,
  MinimumRateInput,
  PenaltyDayType,
  PenaltyEmploymentScope,
  PenaltyRateRow,
  ShiftCostInput,
  ShiftCostResult,
} from "@/server/workforce/award/award-types";

export function resolveMinimumRateFromPack(
  pack: AwardRulePack,
  input: MinimumRateInput,
): number {
  const asOf = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const level = input.classificationLevel ?? gradeToLevel(input.classificationGrade);
  const row = findRateRow(pack, {
    level,
    grade: input.classificationGrade,
    employmentType: input.employmentType,
    asOf,
  });
  if (!row) {
    throw new AwardServiceError(
      422,
      `No rate effective on ${asOf} for ${pack.awardCode} grade ${input.classificationGrade}.`,
      "rate_not_effective",
    );
  }
  return input.employmentType === "casual" ? row.casualLoadedHourlyCents : row.baseHourlyCents;
}

export function computeShiftCostWithPack(
  pack: AwardRulePack,
  input: ShiftCostInput,
): ShiftCostResult {
  const asOf = input.asOfDate ?? input.startsAt.slice(0, 10);
  const paidHours = paidHoursFromBounds(input.startsAt, input.endsAt, input.breakMinutes);
  if (paidHours <= 0) {
    throw new AwardServiceError(422, "Shift must have positive paid hours.", "validation_error");
  }

  const level = input.classificationLevel ?? gradeToLevel(input.classificationGrade);
  const rateRow = findRateRow(pack, {
    level,
    grade: input.classificationGrade,
    employmentType: input.employmentType,
    asOf,
  });
  if (!rateRow) {
    throw new AwardServiceError(
      422,
      `No rate effective on ${asOf} for ${pack.awardCode} grade ${input.classificationGrade}.`,
      "rate_not_effective",
    );
  }

  const workingHourly =
    input.hourlyRateCents ??
    (input.employmentType === "casual"
      ? rateRow.casualLoadedHourlyCents
      : rateRow.baseHourlyCents);

  const appliedRules: string[] = [];
  if (input.employmentType === "casual") {
    appliedRules.push(`Casual loading ${pack.casualLoadingPct}%`);
  }

  const penaltyExtraHourly = resolvePenaltyExtraHourly({
    pack,
    input,
    rateRowBase: rateRow.baseHourlyCents,
    level,
    appliedRules,
  });

  const effectiveHourly = workingHourly + penaltyExtraHourly;
  const baseCostCents = Math.round(workingHourly * paidHours);
  const computedCostCents = Math.round(effectiveHourly * paidHours);
  const penaltyCostCents = computedCostCents - baseCostCents;

  return {
    awardCode: pack.awardCode,
    computedCostCents,
    baseCostCents,
    penaltyCostCents,
    paidHours,
    appliedRules,
  };
}

function findRateRow(
  pack: AwardRulePack,
  args: {
    level: string;
    grade: string;
    employmentType: EmploymentTypeScope;
    asOf: string;
  },
) {
  return pack.rates.find(
    (r) =>
      r.classificationGrade === args.grade &&
      r.classificationLevel === args.level &&
      r.employmentType === args.employmentType &&
      r.effectiveFrom <= args.asOf &&
      (r.effectiveUntil == null || r.effectiveUntil >= args.asOf),
  );
}

function gradeToLevel(grade: string): string {
  return `Level ${grade}`;
}

function paidHoursFromBounds(startsAt: string, endsAt: string, breakMinutes: number): number {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  const grossMins = (endMs - startMs) / 60000;
  return Math.max(0, (grossMins - breakMinutes) / 60);
}

function resolvePenaltyExtraHourly(args: {
  pack: AwardRulePack;
  input: ShiftCostInput;
  rateRowBase: number;
  level: string;
  appliedRules: string[];
}): number {
  const dayType = resolveDayType(args.input.startsAt, args.input.timezone);
  const localTime = localTimeHm(args.input.startsAt, args.input.timezone);
  const scope = employmentToPenaltyScope(args.input.employmentType);

  const applicable = args.pack.penalties.filter((p) => {
    if (p.dayType !== dayType) return false;
    if (p.classificationLevel && p.classificationLevel !== args.level) return false;
    if (!penaltyScopeMatches(p.employmentTypeScope, scope)) return false;
    return timeInRange(localTime, p.timeStart, p.timeEnd);
  });

  if (applicable.length === 0 && (dayType === "saturday" || dayType === "sunday")) {
    throw new AwardServiceError(
      422,
      `Penalty schedule gap for ${args.pack.awardCode} on ${dayType}.`,
      "penalty_schedule_gap",
    );
  }

  let bestExtra = 0;
  let bestLabel = "";

  for (const p of applicable) {
    const extra = penaltyExtraCentsPerHour(p, args.rateRowBase);
    if (extra > bestExtra) {
      bestExtra = extra;
      bestLabel = formatPenaltyLabel(p);
    }
  }

  if (bestLabel) {
    args.appliedRules.push(bestLabel);
  }

  return bestExtra;
}

function penaltyExtraCentsPerHour(p: PenaltyRateRow, baseHourlyCents: number): number {
  if (p.upliftType === "percentage") {
    return Math.round(baseHourlyCents * (p.upliftValue / 100));
  }
  return Math.round(p.upliftValue);
}

function formatPenaltyLabel(p: PenaltyRateRow): string {
  const dayLabel = penaltyDayLabel(p.dayType);
  if (p.upliftType === "percentage") {
    return `${dayLabel} +${p.upliftValue}% penalty`;
  }
  return `${dayLabel} +$${(p.upliftValue / 100).toFixed(2)}/hr`;
}

function penaltyDayLabel(dayType: PenaltyDayType): string {
  switch (dayType) {
    case "mon_fri":
      return "Mon–Fri";
    case "saturday":
      return "Saturday";
    case "sunday":
      return "Sunday";
    case "public_holiday":
      return "Public holiday";
    default:
      return dayType;
  }
}

function employmentToPenaltyScope(
  employmentType: EmploymentTypeScope,
): "ft_pt" | "casual" {
  return employmentType === "casual" ? "casual" : "ft_pt";
}

function penaltyScopeMatches(ruleScope: PenaltyEmploymentScope, actual: "ft_pt" | "casual"): boolean {
  if (ruleScope === "all") return true;
  return ruleScope === actual;
}

function resolveDayType(isoTimestamptz: string, timezone: string): PenaltyDayType {
  const weekday = new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date(isoTimestamptz));

  switch (weekday) {
    case "Sat":
      return "saturday";
    case "Sun":
      return "sunday";
    default:
      return "mon_fri";
  }
}

function localTimeHm(isoTimestamptz: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoTimestamptz));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function timeInRange(hm: string, start: string, end: string): boolean {
  const t = hmToMinutes(hm);
  const s = hmToMinutes(start.slice(0, 5));
  let e = hmToMinutes(end.slice(0, 5));
  if (e <= s) {
    return t >= s || t < e;
  }
  return t >= s && t < e;
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function getMinimumEngagementFromPack(
  pack: AwardRulePack,
  employmentType: EmploymentTypeScope,
  dayType = "regular",
): number | null {
  const row = pack.minimumEngagements.find(
    (m) => m.employmentType === employmentType && m.dayType === dayType,
  );
  return row?.minimumHours ?? null;
}
