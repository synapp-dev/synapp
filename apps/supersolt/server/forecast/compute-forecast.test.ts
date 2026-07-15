import { describe, expect, it } from "vitest";
import {
  computeForecastForDate,
  computeForecasts,
  computeForecastsForDateRange,
} from "@/server/forecast/compute-forecast";
import type { DailySalesAggregate } from "@/server/forecast/types";

function day(
  date: string,
  revenueCents: number,
  ordersCount = 10
): DailySalesAggregate {
  const avg = ordersCount === 0 ? 0 : Math.round(revenueCents / ordersCount);
  return {
    date,
    revenueCents,
    ordersCount,
    avgCheckCents: avg,
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: revenueCents,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
  };
}

/** Build 8 consecutive Tuesdays with stable revenue. */
function eightTuesdaysEndingBefore(targetTuesday: string): DailySalesAggregate[] {
  const rows: DailySalesAggregate[] = [];
  const parts = targetTuesday.split("-").map(Number);
  let y = parts[0] ?? 2026;
  let m = parts[1] ?? 5;
  let d = parts[2] ?? 20;

  for (let i = 8; i >= 1; i -= 1) {
    const dt = new Date(Date.UTC(y, m - 1, d - i * 7, 12));
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    rows.push(day(iso, 250_000));
  }
  return rows;
}

describe("empirical confidence bands", () => {
  function series(valueFor: (i: number, iso: string) => number): DailySalesAggregate[] {
    const rows: DailySalesAggregate[] = [];
    const start = new Date(Date.UTC(2026, 1, 2)); // 84 days => "high" confidence
    for (let i = 0; i < 84; i += 1) {
      const dt = new Date(start.getTime() + i * 86_400_000);
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      rows.push(day(iso, valueFor(i, iso), 150));
    }
    return rows;
  }
  const todayIso = "2026-04-27";
  const bandWidth = (history: DailySalesAggregate[]) => {
    const rev = computeForecasts({ history, todayIso }).find(
      (r) => r.date === todayIso && r.metric === "revenue",
    );
    const lo = rev?.confidenceLowerBound ?? 0;
    const hi = rev?.confidenceUpperBound ?? 0;
    return { row: rev, width: rev?.forecastValue ? (hi - lo) / rev.forecastValue : 0, lo, hi };
  };

  it("widens the band when history is more volatile", () => {
    const stable = bandWidth(series(() => 300_000));
    const volatile = bandWidth(series((i) => (i % 2 === 0 ? 200_000 : 400_000)));
    expect(volatile.width).toBeGreaterThan(stable.width);
    expect(stable.width).toBeLessThan(0.05); // near-zero variance => tight band
    expect(volatile.width).toBeGreaterThan(0.2);
  });

  it("keeps the forecast inside its band", () => {
    const { row, lo, hi } = bandWidth(series((i) => 250_000 + (i % 7) * 20_000));
    expect(row).toBeDefined();
    expect(lo).toBeLessThanOrEqual(row!.forecastValue);
    expect(hi).toBeGreaterThanOrEqual(row!.forecastValue);
  });
});

describe("computeForecasts", () => {
  it("returns no rows when history is under 14 days", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      day(`2026-05-${String(i + 1).padStart(2, "0")}`, 100_000)
    );
    const result = computeForecasts({
      history,
      todayIso: "2026-05-15",
    });
    expect(result).toHaveLength(0);
  });

  it("emits 14 days × 3 metrics when history qualifies", () => {
    const history: DailySalesAggregate[] = [];
    for (let i = 0; i < 42; i += 1) {
      const dt = new Date(Date.UTC(2026, 2, 1 + i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      history.push(day(iso, 200_000 + i * 100));
    }
    const result = computeForecasts({
      history,
      todayIso: "2026-05-15",
    });
    expect(result.length).toBe(14 * 3);
    expect(result.every((r) => r.confidence === "high")).toBe(true);
  });

  it("uses same-weekday baseline near 250000 cents for revenue", () => {
    const todayIso = "2026-05-20";
    const history = [
      ...eightTuesdaysEndingBefore(todayIso),
      ...Array.from({ length: 34 }, (_, i) =>
        day(`2026-04-${String((i % 28) + 1).padStart(2, "0")}`, 180_000)
      ),
    ];

    const result = computeForecasts({ history, todayIso });
    const firstRevenue = result.find(
      (r) => r.date === todayIso && r.metric === "revenue"
    );
    expect(firstRevenue).toBeDefined();
    expect(firstRevenue?.forecastValue).toBeGreaterThan(200_000);
    expect(firstRevenue?.inputs.sameWeekdaySampleCount).toBeGreaterThan(0);
  });
});

describe("baseline anomaly guard", () => {
  it("excludes a soft-opening low-volume day from the same-weekday baseline", () => {
    const todayIso = "2026-05-20"; // a Tuesday; forward forecast reads the prior Tuesdays
    // Eight normal Tuesdays at 250k, but replace the oldest with a 16k soft-opening day.
    const tuesdays = eightTuesdaysEndingBefore(todayIso);
    const poisoned = [
      day(tuesdays[0]!.date, 16_000, 1),
      ...tuesdays.slice(1),
    ];
    // Filler so we clear the 14-day history gate with realistic (non-anomalous) volume.
    const filler = Array.from({ length: 34 }, (_, i) =>
      day(`2026-04-${String((i % 28) + 1).padStart(2, "0")}`, 240_000, 150)
    );

    const withPoison = computeForecasts({
      history: [...poisoned, ...filler],
      todayIso,
    });
    const clean = computeForecasts({
      history: [...tuesdays, ...filler],
      todayIso,
    });

    const poisonRev = withPoison.find(
      (r) => r.date === todayIso && r.metric === "revenue"
    );
    const cleanRev = clean.find(
      (r) => r.date === todayIso && r.metric === "revenue"
    );

    // With the guard, the 16k anomaly is dropped, so the forecast stays near 250k rather than
    // being dragged down toward it. (Excluding the day leaves one fewer sample than a fully clean
    // series, so allow a sub-1% difference from the trend-blend rather than exact equality.)
    const poison = poisonRev?.forecastValue ?? 0;
    const clean2 = cleanRev?.forecastValue ?? 0;
    expect(Math.abs(poison - clean2) / clean2).toBeLessThan(0.01);
    expect(poison).toBeGreaterThan(240_000);
  });
});

describe("trend blend", () => {
  it("tracks an upward trend above the plain same-weekday mean once history is deep enough", () => {
    const todayIso = "2026-05-26"; // a Tuesday we forecast for
    // A clean, steadily rising daily series ending the day before the target (>=28 days).
    const history: DailySalesAggregate[] = [];
    const start = new Date(Date.UTC(2026, 3, 21)); // 2026-04-21
    for (let i = 0; i < 35; i += 1) {
      const dt = new Date(start.getTime() + i * 86_400_000);
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      if (iso >= todayIso) break;
      // Weekend lift + a clear upward trend over time.
      const dow = dt.getUTCDay();
      const weekendLift = dow === 5 || dow === 6 ? 1.4 : 1;
      history.push(day(iso, Math.round((200_000 + i * 3_000) * weekendLift), 150));
    }

    // Plain same-weekday mean of the last 8 Tuesdays in the series.
    const tuesdayRevs = history
      .filter((r) => new Date(`${r.date}T12:00:00Z`).getUTCDay() === 2)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map((r) => r.revenueCents);
    const plainMean =
      tuesdayRevs.reduce((s, v) => s + v, 0) / tuesdayRevs.length;

    const result = computeForecasts({ history, todayIso });
    const rev = result.find((r) => r.date === todayIso && r.metric === "revenue");

    expect(rev).toBeDefined();
    expect(rev?.inputs.trendBlendWeight).toBe(0.5);
    expect(rev?.inputs.trendLevelBaseline).toBeGreaterThan(0);
    // The blend leans toward the fresher, higher level rather than the stale 8-week mean.
    expect(rev?.forecastValue).toBeGreaterThan(plainMean);
  });

  it("stays on the pure same-weekday baseline during cold start (<28 days history)", () => {
    const history: DailySalesAggregate[] = [];
    for (let i = 0; i < 20; i += 1) {
      const dt = new Date(Date.UTC(2026, 2, 1 + i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      history.push(day(iso, 200_000, 100));
    }
    const result = computeForecasts({ history, todayIso: "2026-03-22" });
    const rev = result.find((r) => r.metric === "revenue");
    expect(rev).toBeDefined();
    expect(rev?.inputs.trendBlendWeight).toBeUndefined();
    expect(rev?.inputs.trendLevelBaseline).toBeUndefined();
  });
});

describe("computeForecastForDate", () => {
  it("backcasts a past date using only prior history", () => {
    const history: DailySalesAggregate[] = [];
    for (let i = 0; i < 42; i += 1) {
      const dt = new Date(Date.UTC(2026, 2, 1 + i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      history.push(day(iso, 200_000));
    }

    const targetDate = "2026-05-15";
    const backcast = computeForecastForDate({ history, targetDateIso: targetDate });
    expect(backcast).toHaveLength(3);
    expect(backcast.every((r) => r.date === targetDate)).toBe(true);

    const forwardOnly = computeForecasts({ history, todayIso: "2026-05-20" });
    expect(forwardOnly.some((r) => r.date === targetDate)).toBe(false);
  });

  it("returns no rows when fewer than 14 days precede the target date", () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      day(`2026-05-${String(i + 1).padStart(2, "0")}`, 100_000)
    );
    const backcast = computeForecastForDate({
      history,
      targetDateIso: "2026-05-10",
    });
    expect(backcast).toHaveLength(0);
  });
});

describe("weather multiplier", () => {
  function flatHistory(): DailySalesAggregate[] {
    const history: DailySalesAggregate[] = [];
    for (let i = 0; i < 42; i += 1) {
      const dt = new Date(Date.UTC(2026, 2, 1 + i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      history.push(day(iso, 200_000));
    }
    return history;
  }

  const weather = {
    bucketsByDate: { "2026-05-15": "heavy_rain" as const },
    multipliers: {
      revenue: { dry: 1, light_rain: 0.98, heavy_rain: 0.9 },
      orders: { dry: 1, light_rain: 0.99, heavy_rain: 0.95 },
      avg_check: { dry: 1, light_rain: 1, heavy_rain: 1 },
    },
  };

  it("scales the forecast and records the bucket in inputs", () => {
    const history = flatHistory();
    const withoutWeather = computeForecasts({ history, todayIso: "2026-05-15" });
    const withWeather = computeForecasts({
      history,
      todayIso: "2026-05-15",
      weather,
    });

    const baseRevenue = withoutWeather.find(
      (r) => r.date === "2026-05-15" && r.metric === "revenue"
    );
    const wetRevenue = withWeather.find(
      (r) => r.date === "2026-05-15" && r.metric === "revenue"
    );
    expect(baseRevenue).toBeDefined();
    expect(wetRevenue).toBeDefined();
    expect(wetRevenue?.forecastValue).toBe(
      Math.round((baseRevenue?.forecastValue ?? 0) * 0.9)
    );
    expect(wetRevenue?.inputs.weatherMultiplier).toBe(0.9);
    expect(wetRevenue?.inputs.weatherBucket).toBe("heavy_rain");
  });

  it("leaves dates without weather data untouched", () => {
    const history = flatHistory();
    const withWeather = computeForecasts({
      history,
      todayIso: "2026-05-15",
      weather,
    });
    const unknownDay = withWeather.find(
      (r) => r.date === "2026-05-16" && r.metric === "revenue"
    );
    expect(unknownDay?.inputs.weatherMultiplier).toBe(1);
    expect(unknownDay?.inputs.weatherBucket).toBeUndefined();
  });
});

describe("computeForecastsForDateRange", () => {
  it("includes backcasts for each day in range", () => {
    const history: DailySalesAggregate[] = [];
    for (let i = 0; i < 42; i += 1) {
      const dt = new Date(Date.UTC(2026, 2, 1 + i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      history.push(day(iso, 200_000));
    }

    const rows = computeForecastsForDateRange({
      history,
      fromDate: "2026-05-12",
      toDate: "2026-05-14",
    });

    expect(rows).toHaveLength(3 * 3);
    expect(new Set(rows.map((r) => r.date))).toEqual(
      new Set(["2026-05-12", "2026-05-14", "2026-05-13"])
    );
  });
});
