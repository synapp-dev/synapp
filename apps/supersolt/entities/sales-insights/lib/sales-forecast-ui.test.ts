import { describe, expect, it } from "vitest";
import {
  buildForecastOutlookDays,
  buildSalesVsForecastChartPoints,
  calendarDatesInRange,
  computeForecastDelta,
  forecastAccuracyPct,
  forecastDriverChips,
  summarizeComparableForecastPeriod,
  summarizeForecastAccuracy,
  sumForecastInRange,
} from "@/entities/sales-insights/lib/sales-forecast-ui";
import type {
  DailySalesRow,
  ForecastInputs,
  ForecastRow,
} from "@/entities/forecast/model/types";

function neutralInputs(overrides: Partial<ForecastInputs> = {}): ForecastInputs {
  return {
    baseline: 100_000,
    trendMultiplier: 1,
    monthlySeasonalityMultiplier: 1,
    holidayMultiplier: 1,
    schoolHolidayMultiplier: 1,
    weatherMultiplier: 1,
    sameWeekdaySampleCount: 8,
    ...overrides,
  };
}

function revenueForecast(
  date: string,
  value: number,
  overrides: Partial<ForecastRow> = {}
): ForecastRow {
  return {
    date,
    metric: "revenue",
    forecastValue: value,
    confidence: "high",
    confidenceLowerBound: null,
    confidenceUpperBound: null,
    inputs: neutralInputs(),
    ...overrides,
  };
}

function dailySalesRow(date: string, revenueCents: number): DailySalesRow {
  return {
    venueId: "v1",
    date,
    revenueCents,
    ordersCount: 10,
    avgCheckCents: Math.round(revenueCents / 10),
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: revenueCents,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
    source: "square",
    computedAt: `${date}T00:00:00Z`,
  };
}

describe("sales-forecast-ui", () => {
  it("lists each calendar day in range", () => {
    const start = new Date(2026, 4, 1);
    const end = new Date(2026, 4, 3);
    expect(calendarDatesInRange(start, end)).toEqual([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ]);
  });

  it("merges daily sales and revenue forecasts for chart points", () => {
    const dailySales: DailySalesRow[] = [
      {
        venueId: "v1",
        date: "2026-05-01",
        revenueCents: 50_000,
        ordersCount: 10,
        avgCheckCents: 5_000,
        refundsCount: 0,
        refundsValueCents: 0,
        voidsCount: 0,
        dineInRevenueCents: 50_000,
        pickUpRevenueCents: 0,
        deliveryRevenueCents: 0,
        source: "square",
        computedAt: "2026-05-01T00:00:00Z",
      },
    ];
    const forecasts: ForecastRow[] = [
      {
        date: "2026-05-02",
        metric: "revenue",
        forecastValue: 40_000,
        confidence: "medium",
        confidenceLowerBound: 35_000,
        confidenceUpperBound: 45_000,
        inputs: {
          baseline: 40_000,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 4,
        },
      },
    ];

    const points = buildSalesVsForecastChartPoints(
      dailySales,
      forecasts,
      ["2026-05-01", "2026-05-02"]
    );

    expect(points[0]?.actual).toBe(500);
    expect(points[0]?.forecast).toBeNull();
    expect(points[1]?.actual).toBeNull();
    expect(points[1]?.forecast).toBe(400);
  });

  it("sums forecast metrics in range", () => {
    const forecasts: ForecastRow[] = [
      {
        date: "2026-05-01",
        metric: "orders",
        forecastValue: 12,
        confidence: "low",
        confidenceLowerBound: null,
        confidenceUpperBound: null,
        inputs: {
          baseline: 12,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 2,
        },
      },
      {
        date: "2026-05-02",
        metric: "orders",
        forecastValue: 15,
        confidence: "low",
        confidenceLowerBound: null,
        confidenceUpperBound: null,
        inputs: {
          baseline: 15,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 2,
        },
      },
    ];

    expect(sumForecastInRange(forecasts, "orders", ["2026-05-01", "2026-05-02"])).toBe(
      27
    );
  });

  it("computes forecast delta percent", () => {
    expect(computeForecastDelta(110, 100)).toEqual({
      pct: 10,
      direction: "up",
    });
    expect(computeForecastDelta(90, 100)).toEqual({
      pct: -10,
      direction: "down",
    });
  });

  it("frames forecast misses as accuracy, floored at zero", () => {
    expect(forecastAccuracyPct({ pct: -9.2, direction: "down" })).toBeCloseTo(
      90.8
    );
    expect(forecastAccuracyPct({ pct: 10, direction: "up" })).toBeCloseTo(90);
    expect(forecastAccuracyPct({ pct: 0, direction: "flat" })).toBe(100);
    expect(forecastAccuracyPct({ pct: -140, direction: "down" })).toBe(0);
  });

  it("excludes future days without actuals from comparable forecast totals", () => {
    const dailySales: DailySalesRow[] = [
      {
        venueId: "v1",
        date: "2026-05-01",
        revenueCents: 100_000,
        ordersCount: 10,
        avgCheckCents: 10_000,
        refundsCount: 0,
        refundsValueCents: 0,
        voidsCount: 0,
        dineInRevenueCents: 100_000,
        pickUpRevenueCents: 0,
        deliveryRevenueCents: 0,
        source: "square",
        computedAt: "2026-05-01T00:00:00Z",
      },
      {
        venueId: "v1",
        date: "2026-05-02",
        revenueCents: 120_000,
        ordersCount: 12,
        avgCheckCents: 10_000,
        refundsCount: 0,
        refundsValueCents: 0,
        voidsCount: 0,
        dineInRevenueCents: 120_000,
        pickUpRevenueCents: 0,
        deliveryRevenueCents: 0,
        source: "square",
        computedAt: "2026-05-02T00:00:00Z",
      },
    ];
    const forecasts: ForecastRow[] = [
      {
        date: "2026-05-01",
        metric: "revenue",
        forecastValue: 90_000,
        confidence: "high",
        confidenceLowerBound: null,
        confidenceUpperBound: null,
        inputs: {
          baseline: 90_000,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 8,
        },
      },
      {
        date: "2026-05-02",
        metric: "revenue",
        forecastValue: 110_000,
        confidence: "high",
        confidenceLowerBound: null,
        confidenceUpperBound: null,
        inputs: {
          baseline: 110_000,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 8,
        },
      },
      {
        date: "2026-05-03",
        metric: "revenue",
        forecastValue: 500_000,
        confidence: "high",
        confidenceLowerBound: null,
        confidenceUpperBound: null,
        inputs: {
          baseline: 500_000,
          trendMultiplier: 1,
          monthlySeasonalityMultiplier: 1,
          holidayMultiplier: 1,
          schoolHolidayMultiplier: 1,
          weatherMultiplier: 1,
          sameWeekdaySampleCount: 8,
        },
      },
    ];

    const summary = summarizeComparableForecastPeriod(dailySales, forecasts, [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ]);

    expect(summary.comparableDates).toEqual(["2026-05-01", "2026-05-02"]);
    expect(summary.actualRevenueCents).toBe(220_000);
    expect(summary.forecastRevenueCents).toBe(200_000);
    expect(sumForecastInRange(forecasts, "revenue", [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ])).toBe(700_000);
  });

  it("builds driver chips from forecast inputs", () => {
    const chips = forecastDriverChips(
      neutralInputs({
        weatherMultiplier: 0.92,
        weatherBucket: "heavy_rain",
        publicHolidayName: "Anzac Day",
        holidayMultiplier: 1.15,
        schoolHoliday: true,
        eventMultiplier: 1.2,
        events: [{ kind: "promotion", title: "2-for-1 launch" }],
      })
    );

    expect(chips.map((c) => c.label)).toEqual([
      "Heavy rain -8%",
      "Anzac Day +15%",
      "School holidays",
      "2-for-1 launch +20%",
    ]);
    expect(chips.map((c) => c.tone)).toEqual(["down", "up", "neutral", "up"]);
  });

  it("does not attach the event lift to level-shift events", () => {
    const chips = forecastDriverChips(
      neutralInputs({
        events: [{ kind: "price_change", title: "Winter menu prices" }],
      })
    );
    expect(chips).toEqual([
      { key: "event-0", label: "Winter menu prices", tone: "neutral" },
    ]);
  });

  it("builds outlook days in date order with bands and closed flags", () => {
    const forecasts: ForecastRow[] = [
      revenueForecast("2026-07-16", 120_000, {
        confidenceLowerBound: 100_000,
        confidenceUpperBound: 140_000,
      }),
      {
        ...revenueForecast("2026-07-16", 0),
        metric: "orders",
        forecastValue: 42,
      },
      revenueForecast("2026-07-15", 0, {
        inputs: neutralInputs({ closed: true }),
        confidenceLowerBound: 0,
        confidenceUpperBound: 0,
      }),
    ];

    const days = buildForecastOutlookDays(
      forecasts,
      ["2026-07-15", "2026-07-16", "2026-07-17"],
      "2026-07-15"
    );

    expect(days.map((d) => d.date)).toEqual(["2026-07-15", "2026-07-16"]);
    expect(days[0]?.isToday).toBe(true);
    expect(days[0]?.closed).toBe(true);
    expect(days[1]?.revenueLowerCents).toBe(100_000);
    expect(days[1]?.revenueUpperCents).toBe(140_000);
    expect(days[1]?.orders).toBe(42);
  });

  it("scores accuracy against actuals, skipping closed and missing days", () => {
    const dailySales = [
      dailySalesRow("2026-05-01", 110_000),
      dailySalesRow("2026-05-02", 90_000),
    ];
    const forecasts: ForecastRow[] = [
      revenueForecast("2026-05-01", 100_000, {
        confidenceLowerBound: 95_000,
        confidenceUpperBound: 115_000,
      }),
      revenueForecast("2026-05-02", 100_000, {
        confidenceLowerBound: 95_000,
        confidenceUpperBound: 115_000,
      }),
      // Closed day and a day with no actual must not be scored.
      revenueForecast("2026-05-03", 0, {
        inputs: neutralInputs({ closed: true }),
      }),
      revenueForecast("2026-05-04", 100_000),
    ];

    const summary = summarizeForecastAccuracy(dailySales, forecasts, [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
    ]);

    expect(summary.comparedDays).toBe(2);
    // WAPE = (10k + 10k) / 200k = 10% -> 90% accuracy.
    expect(summary.overallAccuracyPct).toBeCloseTo(90);
    expect(summary.medianDailyAccuracyPct).toBeCloseTo(90);
    // 110k inside the band, 90k below it.
    expect(summary.withinBandPct).toBe(50);
    expect(summary.biggestMisses[0]?.date).toBe("2026-05-01");
    expect(summary.days.map((d) => d.date)).toEqual([
      "2026-05-01",
      "2026-05-02",
    ]);
  });
});
