export type HeroPeriodKey = "7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all";

export type HeroPeriodOption = {
  key: HeroPeriodKey;
  /** Shown in the hero header and dropdown, e.g. "Last 7 days". */
  label: string;
  /** Delta-tooltip phrasing, e.g. "vs previous 7 days"; null = no delta. */
  comparisonLabel: string | null;
  /** Window length in days including today; null = everything on record. */
  days: number | null;
};

export const HERO_PERIOD_OPTIONS: HeroPeriodOption[] = [
  { key: "7d", label: "Last 7 days", comparisonLabel: "vs previous 7 days", days: 7 },
  { key: "14d", label: "Last 14 days", comparisonLabel: "vs previous 14 days", days: 14 },
  { key: "30d", label: "Last 30 days", comparisonLabel: "vs previous 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", comparisonLabel: "vs previous 90 days", days: 90 },
  { key: "6m", label: "Last 6 months", comparisonLabel: "vs previous 6 months", days: 183 },
  { key: "1y", label: "Last year", comparisonLabel: "vs previous year", days: 365 },
  { key: "all", label: "All time", comparisonLabel: null, days: null },
];

export function heroPeriodOption(key: HeroPeriodKey): HeroPeriodOption {
  return HERO_PERIOD_OPTIONS.find((option) => option.key === key) ?? HERO_PERIOD_OPTIONS[0]!;
}
