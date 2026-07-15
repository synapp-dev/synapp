import { describe, expect, it } from "vitest";
import { computeForecasts } from "@/server/forecast/compute-forecast";
import type { DailySalesAggregate } from "@/server/forecast/types";
import type { ForecastEventContext } from "@/server/forecast/forecast-events";

function day(date: string, revenueCents: number, ordersCount = 150): DailySalesAggregate {
  return {
    date, revenueCents, ordersCount,
    avgCheckCents: ordersCount ? Math.round(revenueCents / ordersCount) : 0,
    refundsCount: 0, refundsValueCents: 0, voidsCount: 0,
    dineInRevenueCents: revenueCents, pickUpRevenueCents: 0, deliveryRevenueCents: 0,
  };
}

/** 84 flat days ending the day before `todayIso`. */
function flatHistory(perDay = 300_000): DailySalesAggregate[] {
  const rows: DailySalesAggregate[] = [];
  const start = new Date(Date.UTC(2026, 1, 2));
  for (let i = 0; i < 84; i += 1) {
    const dt = new Date(start.getTime() + i * 86_400_000);
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    rows.push(day(iso, perDay, 150));
  }
  return rows;
}
const todayIso = "2026-04-27";
const revOn = (rows: ReturnType<typeof computeForecasts>, date: string) =>
  rows.find((r) => r.date === date && r.metric === "revenue");
const ordOn = (rows: ReturnType<typeof computeForecasts>, date: string) =>
  rows.find((r) => r.date === date && r.metric === "orders");

describe("operator events in the forecast engine", () => {
  it("forces a zero forecast on a closure and flags it", () => {
    const events: ForecastEventContext = {
      events: [{ kind: "closure", startDate: "2026-04-29", endDate: "2026-04-29", title: "Renovation", expectedMultiplier: null }],
    };
    const rows = computeForecasts({ history: flatHistory(), todayIso, events });
    const closedRev = revOn(rows, "2026-04-29");
    expect(closedRev?.forecastValue).toBe(0);
    expect(closedRev?.confidenceLowerBound).toBe(0);
    expect(closedRev?.confidenceUpperBound).toBe(0);
    expect(closedRev?.inputs.closed).toBe(true);
    // A normal day is unaffected.
    expect(revOn(rows, "2026-04-28")?.forecastValue).toBeGreaterThan(0);
  });

  it("applies a promotion multiplier to revenue and orders but not avg check, and widens the band", () => {
    const events: ForecastEventContext = {
      events: [{ kind: "promotion", startDate: "2026-04-30", endDate: "2026-04-30", title: "Launch", expectedMultiplier: 1.2 }],
    };
    // Volatile history so there is a non-zero band to widen.
    const volatile = () => {
      const rows: DailySalesAggregate[] = [];
      const start = new Date(Date.UTC(2026, 1, 2));
      for (let i = 0; i < 84; i += 1) {
        const dt = new Date(start.getTime() + i * 86_400_000);
        const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
        rows.push(day(iso, i % 2 === 0 ? 250_000 : 350_000, 150));
      }
      return rows;
    };
    const base = computeForecasts({ history: volatile(), todayIso });
    const withPromo = computeForecasts({ history: volatile(), todayIso, events });

    const baseRev = revOn(base, "2026-04-30")!;
    const promoRev = revOn(withPromo, "2026-04-30")!;
    expect(promoRev.forecastValue).toBeGreaterThan(baseRev.forecastValue);
    expect(promoRev.forecastValue / baseRev.forecastValue).toBeCloseTo(1.2, 1);
    expect(promoRev.inputs.eventMultiplier).toBeCloseTo(1.2, 5);
    // Orders lifted too.
    expect(ordOn(withPromo, "2026-04-30")!.forecastValue).toBeGreaterThan(
      ordOn(base, "2026-04-30")!.forecastValue,
    );
    // Band is wider than the un-promoted day.
    const baseWidth = (baseRev.confidenceUpperBound ?? 0) - (baseRev.confidenceLowerBound ?? 0);
    const promoWidth = (promoRev.confidenceUpperBound ?? 0) - (promoRev.confidenceLowerBound ?? 0);
    expect(promoWidth / promoRev.forecastValue).toBeGreaterThan(baseWidth / baseRev.forecastValue);
  });

  it("tracks a level shift: a price change lifts the forecast toward post-change data", () => {
    // History steps up 20% from 2026-04-13; a price_change event marks that date.
    const rows: DailySalesAggregate[] = [];
    const start = new Date(Date.UTC(2026, 1, 2));
    for (let i = 0; i < 84; i += 1) {
      const dt = new Date(start.getTime() + i * 86_400_000);
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      rows.push(day(iso, iso >= "2026-04-13" ? 360_000 : 300_000, 150));
    }
    const noEvent = revOn(computeForecasts({ history: rows, todayIso }), todayIso)!;
    const withShift = revOn(
      computeForecasts({
        history: rows,
        todayIso,
        events: { events: [{ kind: "price_change", startDate: "2026-04-13", endDate: "2026-04-13", title: "+20% menu", expectedMultiplier: null }] },
      }),
      todayIso,
    )!;
    // With the level-shift floor, the baseline ignores pre-change 300k days and sits nearer 360k.
    expect(withShift.forecastValue).toBeGreaterThan(noEvent.forecastValue);
    expect(withShift.forecastValue).toBeGreaterThan(340_000);
  });
});
