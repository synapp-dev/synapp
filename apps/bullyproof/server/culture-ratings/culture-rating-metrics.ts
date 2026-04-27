import { z } from "zod";
import {
  compareToBenchmark as compareToBenchmarkMath,
  deriveCultureRatingMetrics as deriveCultureRatingMetricsMath,
  type CultureRatingDerivedMetrics,
  type CultureRatingImprovementVsBenchmark,
  type CultureRatingInputMetrics as CultureRatingInputMetricsShape,
} from "@/lib/culture-rating-math";

/**
 * Raw inputs from the AP Culture Rating template (CultureTemplate sheet, rows 2–9).
 * Derived rows (attendance rate, per-day rates, improvements) are computed in code.
 */
export const cultureRatingInputMetricsSchema = z.object({
  schoolDaysInPeriod: z.number().finite().nonnegative(),
  attendanceFteStudentDays: z.number().finite().nonnegative(),
  absencesFteStudentDays: z.number().finite().nonnegative(),
  minorBehaviourIncidents: z.number().finite().nonnegative(),
  majorBehaviourIncidents: z.number().finite().nonnegative(),
  shortSuspensionsCount: z.number().finite().nonnegative(),
  longSuspensionsCount: z.number().finite().nonnegative(),
  exclusionsCount: z.number().finite().nonnegative(),
});

export type CultureRatingInputMetrics = z.infer<
  typeof cultureRatingInputMetricsSchema
>;

export type { CultureRatingDerivedMetrics, CultureRatingImprovementVsBenchmark };

function asMathInput(m: CultureRatingInputMetrics): CultureRatingInputMetricsShape {
  return m;
}

export function deriveCultureRatingMetrics(
  input: CultureRatingInputMetrics
): CultureRatingDerivedMetrics {
  return deriveCultureRatingMetricsMath(asMathInput(input));
}

export function compareToBenchmark(
  benchmark: CultureRatingInputMetrics,
  comparative: CultureRatingInputMetrics
): CultureRatingImprovementVsBenchmark {
  return compareToBenchmarkMath(asMathInput(benchmark), asMathInput(comparative));
}
