import { buildScopedPath } from "@/lib/build-scoped-path";
import { pickInsightsPeriodSearchParams } from "@/entities/insights/lib/period";

export type InsightsTabSection = "sales" | "labour" | "inventory" | "p-and-l";

export function buildInsightsTabHref(
  organisationSlug: string,
  venueSlug: string,
  section: InsightsTabSection,
  searchParams: URLSearchParams,
): string {
  const base = buildScopedPath(organisationSlug, venueSlug, `insights/${section}`);
  const periodQuery = pickInsightsPeriodSearchParams(searchParams);
  return periodQuery ? `${base}?${periodQuery}` : base;
}
