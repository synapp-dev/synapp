import { describe, expect, it } from "vitest";
import {
  compareToBenchmark,
  type CultureRatingInputMetrics,
} from "./culture-rating-math";

function metrics(
  overrides: Partial<CultureRatingInputMetrics>
): CultureRatingInputMetrics {
  return {
    schoolDaysInPeriod: 50,
    attendanceFteStudentDays: 9000,
    absencesFteStudentDays: 1000,
    minorBehaviourIncidents: 80,
    majorBehaviourIncidents: 20,
    shortSuspensionsCount: 8,
    longSuspensionsCount: 2,
    exclusionsCount: 1,
    ...overrides,
  };
}

describe("compareToBenchmark headline weighting", () => {
  it("computes the headline from all four metrics when all have data", () => {
    const benchmark = metrics({});
    const comparative = metrics({
      attendanceFteStudentDays: 9200,
      absencesFteStudentDays: 800,
      minorBehaviourIncidents: 60,
      majorBehaviourIncidents: 15,
      shortSuspensionsCount: 6,
      longSuspensionsCount: 1,
      exclusionsCount: 0,
    });
    const result = compareToBenchmark(benchmark, comparative);
    expect(result.attendanceRateChangePercent).not.toBeNull();
    expect(result.behaviourIncidentsRateChangePercent).not.toBeNull();
    expect(result.suspensionsRateChangePercent).not.toBeNull();
    expect(result.exclusionsRateChangePercent).not.toBeNull();
    expect(result.cultureRatingPercent).not.toBeNull();
  });

  it("re-distributes weight when one metric has a zero-base benchmark", () => {
    // Benchmark exclusions = 0 but comparative > 0: change is unmeasurable.
    const benchmark = metrics({ exclusionsCount: 0 });
    const comparative = metrics({
      attendanceFteStudentDays: 9200,
      absencesFteStudentDays: 800,
      minorBehaviourIncidents: 60,
      majorBehaviourIncidents: 15,
      shortSuspensionsCount: 6,
      longSuspensionsCount: 1,
      exclusionsCount: 2,
    });
    const result = compareToBenchmark(benchmark, comparative);
    expect(result.exclusionsRateChangePercent).toBeNull();
    // Headline still computes from the remaining three metrics.
    expect(result.cultureRatingPercent).not.toBeNull();
    // And equals the weight-renormalised sum of the available metrics.
    const att = result.attendanceRateChangePercent as number;
    const beh = result.behaviourIncidentsRateChangePercent as number;
    const sus = result.suspensionsRateChangePercent as number;
    const availableWeight = 0.47 + 0.165 + 0.165;
    const expected =
      (0.47 / availableWeight) * att +
      (0.165 / availableWeight) * beh +
      (0.165 / availableWeight) * sus;
    expect(result.cultureRatingPercent).toBeCloseTo(expected, 10);
  });

  it("treats zero-to-zero as no change rather than missing data", () => {
    const benchmark = metrics({ exclusionsCount: 0 });
    const comparative = metrics({
      attendanceFteStudentDays: 9200,
      absencesFteStudentDays: 800,
      exclusionsCount: 0,
    });
    const result = compareToBenchmark(benchmark, comparative);
    expect(result.exclusionsRateChangePercent).toBe(0);
    expect(result.cultureRatingPercent).not.toBeNull();
  });

  it("computes the headline from a single available metric", () => {
    // Only attendance has data; incident counts are zero-based in the benchmark
    // with non-zero comparatives, so they drop out.
    const benchmark = metrics({
      minorBehaviourIncidents: 0,
      majorBehaviourIncidents: 0,
      shortSuspensionsCount: 0,
      longSuspensionsCount: 0,
      exclusionsCount: 0,
    });
    const comparative = metrics({
      attendanceFteStudentDays: 9200,
      absencesFteStudentDays: 800,
      minorBehaviourIncidents: 5,
      majorBehaviourIncidents: 0,
      shortSuspensionsCount: 1,
      longSuspensionsCount: 0,
      exclusionsCount: 1,
    });
    const result = compareToBenchmark(benchmark, comparative);
    expect(result.behaviourIncidentsRateChangePercent).toBeNull();
    expect(result.suspensionsRateChangePercent).toBeNull();
    expect(result.exclusionsRateChangePercent).toBeNull();
    expect(result.cultureRatingPercent).toBeCloseTo(
      result.attendanceRateChangePercent as number,
      10
    );
  });

  it("returns a null headline only when no metric has data", () => {
    const benchmark = metrics({
      attendanceFteStudentDays: 0,
      absencesFteStudentDays: 0,
      minorBehaviourIncidents: 0,
      majorBehaviourIncidents: 0,
      shortSuspensionsCount: 0,
      longSuspensionsCount: 0,
      exclusionsCount: 0,
    });
    const comparative = metrics({});
    const result = compareToBenchmark(benchmark, comparative);
    expect(result.cultureRatingPercent).toBeNull();
  });
});
