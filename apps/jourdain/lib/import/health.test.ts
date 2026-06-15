import { describe, expect, it } from "vitest";
import { parseHealthExport } from "./health";

// A trimmed Health Auto Export payload: one simple `qty` metric, one range
// metric (heart_rate with Avg/Min/Max), the sleep_analysis special case, and
// one workout carrying nested high-frequency arrays we expect to be dropped.
const SAMPLE = {
  data: {
    metrics: [
      {
        name: "step_count",
        units: "count",
        data: [
          { date: "2026-03-16 00:00:00 +1100", qty: 8647.3, source: "Watch" },
          { date: "2026-03-17 00:00:00 +1100", qty: 9001, source: "Watch" },
        ],
      },
      {
        name: "heart_rate",
        units: "count/min",
        data: [
          { date: "2026-03-16 00:00:00 +1100", Avg: 88.04, Max: 130, Min: 58 },
        ],
      },
      {
        name: "sleep_analysis",
        units: "hr",
        data: [
          {
            date: "2026-03-16 00:00:00 +1100",
            inBedStart: "2026-03-16 06:56:24 +1100",
            sleepStart: "2026-03-16 06:56:24 +1100",
            sleepEnd: "2026-03-16 14:08:58 +1100",
            rem: 1.5,
            deep: 0.8,
            core: 4.7,
            awake: 0.1,
            totalSleep: 7.07,
            source: "Watch",
          },
        ],
      },
    ],
    workouts: [
      {
        id: "ABC-123",
        name: "Indoor Walk",
        start: "2026-06-05 17:30:44 +1000",
        end: "2026-06-05 17:54:00 +1000",
        duration: 1395.13,
        isIndoor: true,
        location: "Indoor",
        totalEnergy: { qty: 468.45, units: "kJ" },
        activeEnergyBurned: { qty: 276.03, units: "kJ" },
        distance: { qty: 1.1, units: "km" },
        heartRate: { avg: { qty: 110.9 }, max: { qty: 121 }, min: { qty: 95 } },
        heartRateData: [{ Avg: 115, date: "x" }],
        activeEnergy: [{ qty: 9.9 }],
      },
    ],
    ecg: [{ classification: "Sinus Rhythm" }],
  },
};

describe("parseHealthExport", () => {
  it("flattens daily qty metrics and keys them by local date", () => {
    const { metrics } = parseHealthExport(SAMPLE);
    const steps = metrics.filter((m) => m.name === "step_count");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ date: "2026-03-16", qty: 8647.3 });
    expect(steps[0]?.min).toBeNull();
  });

  it("captures Avg/Min/Max for range metrics and uses Avg as qty", () => {
    const { metrics } = parseHealthExport(SAMPLE);
    const hr = metrics.find((m) => m.name === "heart_rate");
    expect(hr).toMatchObject({ qty: 88.04, avg: 88.04, min: 58, max: 130 });
  });

  it("pulls sleep_analysis into sleep sessions with ISO timestamps", () => {
    const { sleep, metrics } = parseHealthExport(SAMPLE);
    expect(metrics.some((m) => m.name === "sleep_analysis")).toBe(false);
    expect(sleep).toHaveLength(1);
    expect(sleep[0]).toMatchObject({
      date: "2026-03-16",
      sleepStart: "2026-03-16T06:56:24+11:00",
      sleepEnd: "2026-03-16T14:08:58+11:00",
      totalSleep: 7.07,
      rem: 1.5,
    });
  });

  it("parses workout summaries and drops nested high-frequency arrays", () => {
    const { workouts } = parseHealthExport(SAMPLE);
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({
      externalId: "ABC-123",
      name: "Indoor Walk",
      start: "2026-06-05T17:30:44+10:00",
      duration: 1395.13,
      totalEnergy: 468.45,
      distance: 1.1,
      avgHeartRate: 110.9,
      maxHeartRate: 121,
      minHeartRate: 95,
      isIndoor: true,
    });
    // No raw per-minute series should leak into the parsed object.
    expect(JSON.stringify(workouts[0])).not.toContain("heartRateData");
  });

  it("tolerates string input and missing sections", () => {
    const result = parseHealthExport(JSON.stringify({ data: {} }));
    expect(result).toEqual({ metrics: [], sleep: [], workouts: [] });
  });
});
