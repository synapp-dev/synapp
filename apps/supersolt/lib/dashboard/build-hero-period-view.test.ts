import { describe, expect, it } from "vitest";

import { buildHeroPeriodView } from "@/lib/dashboard/build-hero-period-view";

const TODAY = "2026-05-20";

function rows(entries: Array<[string, number]>) {
  return entries.map(([date, revenueCents]) => ({ date, revenueCents }));
}

describe("buildHeroPeriodView", () => {
  it("sums the trailing window and compares against the one before it", () => {
    const view = buildHeroPeriodView({
      periodKey: "14d",
      today: TODAY,
      dailySales: rows([
        ["2026-05-19", 10_000],
        ["2026-05-10", 20_000],
        // Comparison window (previous 14 days).
        ["2026-05-01", 15_000],
      ]),
      todayLive: { revenueCents: 5_000, hasTrade: true },
    });

    expect(view.hero.periodLabel).toBe("Last 14 days");
    expect(view.hero.countUpEnd).toBe(350); // $100 + $200 + live $50
    expect(view.hero.deltaPercent).toBeCloseTo(133.3, 1);
    expect(view.hero.deltaDirection).toBe("up");
    expect(view.netRevenueSeries).toHaveLength(14);
    expect(view.netRevenueSeries[13]?.label).toBe("Today");
    expect(view.netRevenueSeries[13]?.revenue).toBe(50);
  });

  it("holds today off the line before trade and appends projected days", () => {
    const view = buildHeroPeriodView({
      periodKey: "14d",
      today: TODAY,
      dailySales: rows([["2026-05-19", 10_000]]),
      todayLive: { revenueCents: 0, hasTrade: false },
      revenueForecastCentsByDate: {
        "2026-05-21": 12_000,
        "2026-05-22": 13_000,
      },
    });

    const todayPoint = view.netRevenueSeries.find((p) => p.label === "Today");
    expect(todayPoint?.revenue).toBeNull();
    expect(view.netRevenueSeries).toHaveLength(16); // 14 + 2 projected
    expect(view.netRevenueSeries.at(-1)?.revenue).toBeNull();
    expect(view.netRevenueSeries.at(-1)?.forecast).toBe(130);
  });

  it("spans all recorded history with no delta for all-time", () => {
    const view = buildHeroPeriodView({
      periodKey: "all",
      today: TODAY,
      dailySales: rows([
        ["2026-05-01", 10_000],
        ["2026-05-19", 20_000],
      ]),
      todayLive: null,
    });

    expect(view.hero.periodLabel).toBe("All time");
    expect(view.hero.deltaPercent).toBeNull();
    expect(view.hero.countUpEnd).toBe(300);
    expect(view.netRevenueSeries[0]?.label).toBe("1 May");
    expect(view.netRevenueSeries).toHaveLength(20); // 1–20 May
  });
});
