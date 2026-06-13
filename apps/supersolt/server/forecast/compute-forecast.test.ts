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
