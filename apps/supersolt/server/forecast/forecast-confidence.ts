import type { ForecastConfidence } from "@/server/forecast/types";

/** Notion cold-start: no forecast below 14 days of available history. */
export function confidenceFromHistoryDays(
  days: number
): ForecastConfidence | null {
  if (days < 14) {
    return null;
  }
  if (days < 28) {
    return "low";
  }
  if (days < 42) {
    return "medium";
  }
  return "high";
}

export function countDistinctHistoryDays(dates: string[]): number {
  return new Set(dates).size;
}

export function isForecastReady(availableHistoryDays: number): boolean {
  return availableHistoryDays >= 14;
}
