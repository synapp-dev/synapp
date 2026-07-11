import type { InsightsDatePreset, InsightsDateRange } from "@/entities/insights/model/types";

export const INSIGHTS_PERIOD_PARAM = "preset";
export const INSIGHTS_FROM_PARAM = "from";
export const INSIGHTS_TO_PARAM = "to";

export const DEFAULT_INSIGHTS_PRESET: InsightsDatePreset = "this-week";

const VALID_PRESETS: InsightsDatePreset[] = [
  "today",
  "yesterday",
  "this-week",
  "last-week",
  "this-month",
  "last-month",
  "custom",
];

export function parseInsightsDatePreset(value: string | null): InsightsDatePreset {
  if (value === "last-30") {
    return "last-month";
  }
  if (value && VALID_PRESETS.includes(value as InsightsDatePreset)) {
    return value as InsightsDatePreset;
  }
  return DEFAULT_INSIGHTS_PRESET;
}

export function buildInsightsPeriodQueryString(input: {
  preset: InsightsDatePreset;
  customFrom?: Date;
  customTo?: Date;
}): string {
  const params = new URLSearchParams();
  params.set(INSIGHTS_PERIOD_PARAM, input.preset);
  if (input.preset === "custom") {
    if (input.customFrom) {
      params.set(INSIGHTS_FROM_PARAM, toDateInputValue(input.customFrom));
    }
    if (input.customTo) {
      params.set(INSIGHTS_TO_PARAM, toDateInputValue(input.customTo));
    }
  }
  return params.toString();
}

export function pickInsightsPeriodSearchParams(
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams();
  const preset = searchParams.get(INSIGHTS_PERIOD_PARAM);
  const from = searchParams.get(INSIGHTS_FROM_PARAM);
  const to = searchParams.get(INSIGHTS_TO_PARAM);
  if (preset) {
    params.set(INSIGHTS_PERIOD_PARAM, preset);
  }
  if (from) {
    params.set(INSIGHTS_FROM_PARAM, from);
  }
  if (to) {
    params.set(INSIGHTS_TO_PARAM, to);
  }
  return params.toString();
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, delta));
}

function endOfWeekMonday(date: Date): Date {
  return endOfDay(addDays(startOfWeekMonday(date), 6));
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function getInsightsPresetDateRange(preset: InsightsDatePreset): InsightsDateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = addDays(now, -1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "this-week":
      return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
    case "last-week": {
      const lastWeekAnchor = addDays(now, -7);
      return {
        start: startOfWeekMonday(lastWeekAnchor),
        end: endOfWeekMonday(lastWeekAnchor),
      };
    }
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last-month": {
      const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: startOfMonth(lastMonthAnchor),
        end: endOfMonth(lastMonthAnchor),
      };
    }
    case "custom":
      return { start: startOfDay(now), end: endOfDay(now) };
    default: {
      const neverPreset: never = preset;
      return neverPreset;
    }
  }
}

export function resolveInsightsDateRange(input: {
  preset: InsightsDatePreset;
  customFrom?: Date;
  customTo?: Date;
}): InsightsDateRange {
  if (input.preset !== "custom") {
    return getInsightsPresetDateRange(input.preset);
  }
  const now = new Date();
  return {
    start: input.customFrom ?? startOfDay(now),
    end: input.customTo ?? endOfDay(now),
  };
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string, isEnd: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }
  const [yearValue, monthValue, dayValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return undefined;
  }
  const next = new Date(year, month - 1, day);
  return isEnd ? endOfDay(next) : startOfDay(next);
}

export function formatInsightsDateRangeText(dateRange: InsightsDateRange): string {
  const start = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(dateRange.start);
  const end = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateRange.end);
  return `${start} - ${end}`;
}

export function parseInsightsCustomDates(searchParams: URLSearchParams): {
  customFrom?: Date;
  customTo?: Date;
} {
  const fromRaw = searchParams.get(INSIGHTS_FROM_PARAM);
  const toRaw = searchParams.get(INSIGHTS_TO_PARAM);
  return {
    customFrom: fromRaw ? fromDateInputValue(fromRaw, false) : undefined,
    customTo: toRaw ? fromDateInputValue(toRaw, true) : undefined,
  };
}
