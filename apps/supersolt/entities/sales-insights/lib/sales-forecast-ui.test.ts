import { describe, expect, it } from "vitest";
import {
  buildSalesVsForecastChartPoints,
  calendarDatesInRange,
  computeForecastDelta,
  summarizeComparableForecastPeriod,
  sumForecastInRange,
} from "@/entities/sales-insights/lib/sales-forecast-ui";
import type { DailySalesRow, ForecastRow } from "@/entities/forecast/model/types";

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
});
