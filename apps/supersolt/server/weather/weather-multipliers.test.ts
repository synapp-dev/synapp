import { describe, expect, it } from "vitest";
import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";
import { conditionBucketForRain } from "@/server/weather/weather-buckets";
import {
  fitWeatherMultipliers,
  neutralWeatherMultipliers,
  weatherMultiplierForDate,
  type ForecastWeatherContext,
} from "@/server/weather/weather-multipliers";
import type { WeatherBucket } from "@/server/weather/weather-buckets";

function day(
  date: string,
  revenueCents: number,
  ordersCount = 10,
): DailySalesAggregate {
  return {
    date,
    revenueCents,
    ordersCount,
    avgCheckCents: ordersCount === 0 ? 0 : Math.round(revenueCents / ordersCount),
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: revenueCents,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
  };
}

function isoDaysFrom(startIso: string, count: number): string[] {
  const [y, m, d] = startIso.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + i, 12));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  });
}

describe("conditionBucketForRain", () => {
  it("buckets rainfall", () => {
    expect(conditionBucketForRain(0)).toBe("dry");
    expect(conditionBucketForRain(0.9)).toBe("dry");
    expect(conditionBucketForRain(1)).toBe("light_rain");
    expect(conditionBucketForRain(5.9)).toBe("light_rain");
    expect(conditionBucketForRain(6)).toBe("heavy_rain");
    expect(conditionBucketForRain(40)).toBe("heavy_rain");
  });
});

describe("fitWeatherMultipliers", () => {
  it("returns neutral multipliers when paired history is too short", () => {
    const dates = isoDaysFrom("2026-05-01", 20);
    const history = dates.map((date) => day(date, 100_000));
    const bucketsByDate = Object.fromEntries(
      dates.map((date) => [date, "dry" as WeatherBucket]),
    );
    expect(fitWeatherMultipliers({ history, bucketsByDate })).toEqual(
      neutralWeatherMultipliers(),
    );
  });

  it("detects a rain drop, normalised against dry days and shrunk toward 1", () => {
    // 8 weeks of identical weekdays; every Wednesday is heavy rain at 80% revenue.
    const dates = isoDaysFrom("2026-03-02", 56); // starts a Monday
    const history: DailySalesAggregate[] = [];
    const bucketsByDate: Record<string, WeatherBucket> = {};
    for (const date of dates) {
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      const rainy = dow === 3;
      history.push(day(date, rainy ? 80_000 : 100_000));
      bucketsByDate[date] = rainy ? "heavy_rain" : "dry";
    }

    const result = fitWeatherMultipliers({ history, bucketsByDate });
    // All rainy days are Wednesdays, so the weekday mean absorbs the drop and the
    // heavy_rain ratio equals 1: same-weekday normalisation must not double count.
    expect(result.revenue.heavy_rain).toBeCloseTo(1, 5);
  });

  it("attributes a drop that varies within a weekday to the rain bucket", () => {
    // Every weekday appears 8 times; half of each weekday's occurrences are rainy at 70%.
    const dates = isoDaysFrom("2026-03-02", 56);
    const history: DailySalesAggregate[] = [];
    const bucketsByDate: Record<string, WeatherBucket> = {};
    dates.forEach((date, i) => {
      const rainy = Math.floor(i / 7) % 2 === 0; // alternate whole weeks
      history.push(day(date, rainy ? 70_000 : 100_000));
      bucketsByDate[date] = rainy ? "heavy_rain" : "dry";
    });

    const result = fitWeatherMultipliers({ history, bucketsByDate });
    expect(result.revenue.heavy_rain).toBeLessThan(0.95);
    expect(result.revenue.heavy_rain).toBeGreaterThanOrEqual(0.75);
    expect(result.revenue.dry).toBe(1);
    expect(result.revenue.light_rain).toBe(1);
  });

  it("ignores zero-order (closed) days", () => {
    const dates = isoDaysFrom("2026-03-02", 56);
    const history: DailySalesAggregate[] = [];
    const bucketsByDate: Record<string, WeatherBucket> = {};
    dates.forEach((date, i) => {
      const closed = i % 7 === 6;
      history.push(day(date, closed ? 0 : 100_000, closed ? 0 : 10));
      bucketsByDate[date] = "dry";
    });
    expect(fitWeatherMultipliers({ history, bucketsByDate })).toEqual(
      neutralWeatherMultipliers(),
    );
  });
});

describe("weatherMultiplierForDate", () => {
  const context: ForecastWeatherContext = {
    bucketsByDate: { "2026-07-15": "heavy_rain" },
    multipliers: {
      ...neutralWeatherMultipliers(),
      revenue: { dry: 1, light_rain: 0.98, heavy_rain: 0.9 },
    },
  };

  it("returns the bucket multiplier for a known date", () => {
    expect(weatherMultiplierForDate(context, "2026-07-15", "revenue")).toEqual({
      multiplier: 0.9,
      bucket: "heavy_rain",
    });
  });

  it("returns 1 with no bucket for unknown dates or missing context", () => {
    expect(weatherMultiplierForDate(context, "2026-07-16", "revenue")).toEqual({
      multiplier: 1,
      bucket: null,
    });
    expect(weatherMultiplierForDate(undefined, "2026-07-15", "revenue")).toEqual({
      multiplier: 1,
      bucket: null,
    });
  });
});
