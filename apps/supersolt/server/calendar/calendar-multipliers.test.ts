import { describe, expect, it } from "vitest";
import {
  isSchoolHoliday,
  publicHolidayName,
  resolveCalendarRegion,
} from "@/server/calendar/au-calendar";
import {
  calendarSignalForDate,
  fitCalendarMultipliers,
} from "@/server/calendar/calendar-multipliers";
import type { DailySalesAggregate } from "@/server/forecast/types";

function day(
  date: string,
  revenueCents: number,
  ordersCount = 150,
): DailySalesAggregate {
  return {
    date,
    revenueCents,
    ordersCount,
    avgCheckCents: ordersCount ? Math.round(revenueCents / ordersCount) : 0,
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: revenueCents,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
  };
}

describe("au-calendar predicates", () => {
  it("resolves VIC venues to the AU-VIC region and rejects others", () => {
    expect(resolveCalendarRegion("VIC", "Australia")).toBe("AU-VIC");
    expect(resolveCalendarRegion("Victoria", "AU")).toBe("AU-VIC");
    expect(resolveCalendarRegion("NSW", "Australia")).toBeNull();
    expect(resolveCalendarRegion(null, null)).toBeNull();
  });

  it("names known VIC public holidays", () => {
    expect(publicHolidayName("AU-VIC", "2026-04-25")).toBe("ANZAC Day");
    expect(publicHolidayName("AU-VIC", "2026-06-08")).toBe("King's Birthday");
    expect(publicHolidayName("AU-VIC", "2026-05-20")).toBeNull();
  });

  it("flags school-term breaks and not term days", () => {
    // Autumn break (Term 1 ends 2 Apr, Term 2 starts 20 Apr)
    expect(isSchoolHoliday("AU-VIC", "2026-04-10")).toBe(true);
    // Mid Term 2
    expect(isSchoolHoliday("AU-VIC", "2026-05-20")).toBe(false);
    // Winter break
    expect(isSchoolHoliday("AU-VIC", "2026-07-05")).toBe(true);
  });
});

describe("calendar multipliers", () => {
  // Build 12 weeks of history: every Monday is a fixed public-holiday-name test double.
  function buildHistory(mondayValue: (i: number) => number): DailySalesAggregate[] {
    void mondayValue;
    const rows: DailySalesAggregate[] = [];
    const start = new Date(Date.UTC(2026, 0, 5)); // a Monday
    for (let i = 0; i < 84; i += 1) {
      const dt = new Date(start.getTime() + i * 86_400_000);
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      rows.push(day(iso, 300_000, 150));
    }
    return rows;
  }

  it("stays neutral in year one (each holiday seen only once)", () => {
    const history = buildHistory(() => 300_000);
    const mult = fitCalendarMultipliers({ history, region: "AU-VIC" });
    // No named holiday recurs within a single year of history -> all neutral.
    for (const metric of ["revenue", "orders", "avg_check"] as const) {
      expect(Object.keys(mult[metric])).toHaveLength(0);
    }
    const signal = calendarSignalForDate(
      { region: "AU-VIC", multipliers: mult },
      "2026-04-25",
      "revenue",
    );
    expect(signal.multiplier).toBe(1);
    expect(signal.holidayName).toBe("ANZAC Day");
    expect(signal.schoolHoliday).toBe(false);
  });

  it("applies a learned multiplier and surfaces the holiday / school-holiday flags", () => {
    // A learned effect (as it would exist once a holiday has recurred in a later year).
    const context = {
      region: "AU-VIC" as const,
      multipliers: {
        revenue: { "ANZAC Day": 0.85 },
        orders: {},
        avg_check: {},
      },
    };

    const anzac = calendarSignalForDate(context, "2026-04-25", "revenue");
    expect(anzac.multiplier).toBe(0.85);
    expect(anzac.holidayName).toBe("ANZAC Day");

    // Same holiday, a metric with no learned effect => neutral.
    expect(calendarSignalForDate(context, "2026-04-25", "orders").multiplier).toBe(1);

    // A school-holiday, non-public-holiday day: neutral multiplier but flagged.
    const winter = calendarSignalForDate(context, "2026-07-05", "revenue");
    expect(winter.multiplier).toBe(1);
    expect(winter.holidayName).toBeNull();
    expect(winter.schoolHoliday).toBe(true);
  });
});
