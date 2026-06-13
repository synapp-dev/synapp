export type EmploymentTypeScope = "full_time" | "part_time" | "casual";

export type PenaltyEmploymentScope = "ft_pt" | "casual" | "all";

export type PenaltyDayType = "mon_fri" | "saturday" | "sunday" | "public_holiday";

export type PenaltyUpliftType = "percentage" | "dollar_per_hour";

export type AwardRateRow = {
  classificationLevel: string;
  classificationGrade: string;
  employmentType: EmploymentTypeScope;
  baseHourlyCents: number;
  casualLoadedHourlyCents: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type PenaltyRateRow = {
  classificationLevel: string | null;
  employmentTypeScope: PenaltyEmploymentScope;
  dayType: PenaltyDayType;
  timeStart: string;
  timeEnd: string;
  upliftType: PenaltyUpliftType;
  upliftValue: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type MinimumEngagementRow = {
  employmentType: EmploymentTypeScope;
  dayType: string;
  minimumHours: number;
};

export type AwardRulePack = {
  awardCode: string;
  awardName: string;
  awardShortName: string;
  prReference: string;
  sourceUrl: string;
  casualLoadingPct: number;
  rates: AwardRateRow[];
  penalties: PenaltyRateRow[];
  minimumEngagements: MinimumEngagementRow[];
};

export type ShiftCostInput = {
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  hourlyRateCents?: number;
  timezone: string;
  employmentType: EmploymentTypeScope;
  classificationLevel?: string | null;
  classificationGrade: string;
  asOfDate?: string;
};

export type ShiftCostResult = {
  awardCode: string;
  computedCostCents: number;
  baseCostCents: number;
  penaltyCostCents: number;
  paidHours: number;
  appliedRules: string[];
};

export type MinimumRateInput = {
  awardCode: string;
  classificationLevel?: string | null;
  classificationGrade: string;
  employmentType: EmploymentTypeScope;
  asOfDate?: string;
};
