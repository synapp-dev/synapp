/**
 * Pure culture-rating calculations (shared by server and client UI).
 * Client display score for the gauge is interim until the client finalises Woodford workbook mapping.
 */

export type CultureRatingInputMetrics = {
  schoolDaysInPeriod: number;
  attendanceFteStudentDays: number;
  absencesFteStudentDays: number;
  minorBehaviourIncidents: number;
  majorBehaviourIncidents: number;
  shortSuspensionsCount: number;
  longSuspensionsCount: number;
  exclusionsCount: number;
};

export type CultureRatingDerivedMetrics = {
  totalPossibleStudentDays: number;
  attendanceRate: number | null;
  behaviourIncidents: number;
  behaviourPerStudentDay: number | null;
  suspensionsTotal: number;
  suspensionsPerStudentDay: number | null;
  exclusionsPerStudentDay: number | null;
};

export type CultureRatingImprovementVsBenchmark = {
  attendanceRateChangePercent: number | null;
  behaviourIncidentsRateChangePercent: number | null;
  suspensionsRateChangePercent: number | null;
  exclusionsRateChangePercent: number | null;
  /** Weighted headline metric aligned to client spreadsheet (~11% for sample data). */
  cultureRatingPercent: number | null;
};

/** Weights fitted to the sample workbook headline (rows 19–22 → row 24). */
const CULTURE_RATING_WEIGHTS = {
  attendance: 0.47,
  behaviour: 0.165,
  suspensions: 0.165,
  exclusions: 0.2,
} as const;

export function deriveCultureRatingMetrics(
  input: CultureRatingInputMetrics
): CultureRatingDerivedMetrics {
  const totalPossibleStudentDays =
    input.attendanceFteStudentDays + input.absencesFteStudentDays;
  const attendanceRate =
    totalPossibleStudentDays > 0
      ? input.attendanceFteStudentDays / totalPossibleStudentDays
      : null;
  const behaviourIncidents =
    input.minorBehaviourIncidents + input.majorBehaviourIncidents;
  const suspensionsTotal =
    input.shortSuspensionsCount + input.longSuspensionsCount;
  const att = input.attendanceFteStudentDays;
  return {
    totalPossibleStudentDays,
    attendanceRate,
    behaviourIncidents,
    behaviourPerStudentDay: att > 0 ? behaviourIncidents / att : null,
    suspensionsTotal,
    suspensionsPerStudentDay: att > 0 ? suspensionsTotal / att : null,
    exclusionsPerStudentDay:
      att > 0 ? input.exclusionsCount / att : null,
  };
}

function pctChangeNumeratorDenominator(
  before: number | null,
  after: number | null,
  lowerIsBetter: boolean
): number | null {
  if (before == null || after == null) return null;
  // Zero in both periods is "no change", not an unknown.
  if (before === 0 && after === 0) return 0;
  if (before === 0) return null;
  const raw = ((after - before) / before) * 100;
  return lowerIsBetter ? -raw : raw;
}

export function compareToBenchmark(
  benchmark: CultureRatingInputMetrics,
  comparative: CultureRatingInputMetrics
): CultureRatingImprovementVsBenchmark {
  const b = deriveCultureRatingMetrics(benchmark);
  const c = deriveCultureRatingMetrics(comparative);

  const attendanceRateChangePercent = pctChangeNumeratorDenominator(
    b.attendanceRate,
    c.attendanceRate,
    false
  );
  const behaviourIncidentsRateChangePercent = pctChangeNumeratorDenominator(
    b.behaviourPerStudentDay,
    c.behaviourPerStudentDay,
    true
  );
  const suspensionsRateChangePercent = pctChangeNumeratorDenominator(
    b.suspensionsPerStudentDay,
    c.suspensionsPerStudentDay,
    true
  );
  const exclusionsRateChangePercent = pctChangeNumeratorDenominator(
    b.exclusionsPerStudentDay,
    c.exclusionsPerStudentDay,
    true
  );

  // A metric with no measurable change (e.g. zero-base denominator) drops out
  // and its weight is re-distributed proportionally across the metrics that
  // do have data, so the headline works with any subset of inputs.
  const components: Array<{ weight: number; value: number | null }> = [
    { weight: CULTURE_RATING_WEIGHTS.attendance, value: attendanceRateChangePercent },
    { weight: CULTURE_RATING_WEIGHTS.behaviour, value: behaviourIncidentsRateChangePercent },
    { weight: CULTURE_RATING_WEIGHTS.suspensions, value: suspensionsRateChangePercent },
    { weight: CULTURE_RATING_WEIGHTS.exclusions, value: exclusionsRateChangePercent },
  ];
  const available = components.filter(
    (component): component is { weight: number; value: number } =>
      component.value != null
  );
  const availableWeight = available.reduce(
    (sum, component) => sum + component.weight,
    0
  );
  const cultureRatingPercent =
    available.length > 0 && availableWeight > 0
      ? available.reduce(
          (sum, component) =>
            sum + (component.weight / availableWeight) * component.value,
          0
        )
      : null;

  return {
    attendanceRateChangePercent,
    behaviourIncidentsRateChangePercent,
    suspensionsRateChangePercent,
    exclusionsRateChangePercent,
    cultureRatingPercent,
  };
}

/** Interim 0–100 gauge display: blend attendance (level) with improvement direction. */
export function cultureRatingGaugeScore(params: {
  comparativeAttendanceRate: number | null;
  improvementPercent: number | null;
}): number {
  const att = params.comparativeAttendanceRate;
  const base =
    att == null ? 50 : Math.round(Math.min(100, Math.max(0, att * 100)));
  const delta = params.improvementPercent;
  if (delta == null) return base;
  const adjusted = base + Math.round(Math.max(-25, Math.min(25, delta / 4)));
  return Math.min(100, Math.max(0, adjusted));
}

export function pctChangeDisplay(
  before: number | null,
  after: number | null,
  lowerIsBetter: boolean
): number | null {
  return pctChangeNumeratorDenominator(before, after, lowerIsBetter);
}
