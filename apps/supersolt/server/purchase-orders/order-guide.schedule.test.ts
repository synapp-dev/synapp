import { describe, expect, it } from "vitest";

import {
  computeSupplierScheduleInfo,
  type DeliveryScheduleEntry,
} from "./order-guide.schedule";

function schedule(
  entries: Array<Partial<DeliveryScheduleEntry> & { day: number }>,
): DeliveryScheduleEntry[] {
  return Array.from({ length: 7 }, (_, day) => {
    const override = entries.find((entry) => entry.day === day);
    return {
      day,
      is_order_day: false,
      order_by_time: null,
      delivery_day: null,
      ...override,
    };
  });
}

// 2026-07-12 is a Sunday.
const SUNDAY = "2026-07-12";

describe("computeSupplierScheduleInfo", () => {
  it("falls back to lead time when the supplier has no order days", () => {
    const info = computeSupplierScheduleInfo({
      schedule: schedule([]),
      leadTimeDays: 3,
      venueToday: SUNDAY,
    });
    expect(info.source).toBe("lead_time");
    expect(info.nextOrderDate).toBe(SUNDAY);
    expect(info.nextOrderIsToday).toBe(true);
    expect(info.nextDeliveryDate).toBe("2026-07-15");
    expect(info.orderDaysLabel).toBeNull();
  });

  it("handles a missing schedule entirely", () => {
    const info = computeSupplierScheduleInfo({
      schedule: null,
      leadTimeDays: 2,
      venueToday: SUNDAY,
    });
    expect(info.source).toBe("lead_time");
    expect(info.nextDeliveryDate).toBe("2026-07-14");
  });

  it("uses today when today is an order day (Floridia-style Wed/Sat)", () => {
    // Order Wed -> deliver Thu; order Sat -> deliver Sun
    const floridia = schedule([
      { day: 3, is_order_day: true, delivery_day: 4 },
      { day: 6, is_order_day: true, delivery_day: 0 },
    ]);
    const wednesday = "2026-07-15";
    const info = computeSupplierScheduleInfo({
      schedule: floridia,
      leadTimeDays: 3,
      venueToday: wednesday,
    });
    expect(info.source).toBe("supplier_schedule");
    expect(info.nextOrderIsToday).toBe(true);
    expect(info.nextOrderDate).toBe(wednesday);
    expect(info.nextDeliveryDate).toBe("2026-07-16");
    expect(info.orderDaysLabel).toBe("Wed & Sat");
  });

  it("rolls to the next order day when today is not one", () => {
    const floridia = schedule([
      { day: 3, is_order_day: true, delivery_day: 4 },
      { day: 6, is_order_day: true, delivery_day: 0 },
    ]);
    const info = computeSupplierScheduleInfo({
      schedule: floridia,
      leadTimeDays: 3,
      venueToday: SUNDAY,
    });
    expect(info.nextOrderIsToday).toBe(false);
    expect(info.nextOrderDate).toBe("2026-07-15");
    expect(info.nextDeliveryDate).toBe("2026-07-16");
  });

  it("wraps delivery into the following week when delivery day precedes order day", () => {
    // Order Saturday, delivered Monday (delta wraps across the weekend).
    const info = computeSupplierScheduleInfo({
      schedule: schedule([{ day: 6, is_order_day: true, delivery_day: 1 }]),
      leadTimeDays: 3,
      venueToday: SUNDAY,
    });
    expect(info.nextOrderDate).toBe("2026-07-18");
    expect(info.nextDeliveryDate).toBe("2026-07-20");
  });

  it("treats same-day pairing as next week's run", () => {
    const info = computeSupplierScheduleInfo({
      schedule: schedule([{ day: 0, is_order_day: true, delivery_day: 0 }]),
      leadTimeDays: 3,
      venueToday: SUNDAY,
    });
    expect(info.nextOrderDate).toBe(SUNDAY);
    expect(info.nextDeliveryDate).toBe("2026-07-19");
  });

  it("uses lead time for order days with no delivery day set", () => {
    const info = computeSupplierScheduleInfo({
      schedule: schedule([{ day: 0, is_order_day: true }]),
      leadTimeDays: 2,
      venueToday: SUNDAY,
    });
    expect(info.nextOrderDate).toBe(SUNDAY);
    expect(info.nextDeliveryDate).toBe("2026-07-14");
  });

  it("labels every-day ordering as any day and keeps the cutoff", () => {
    const daily = schedule(
      Array.from({ length: 7 }, (_, day) => ({
        day,
        is_order_day: true,
        delivery_day: (day + 1) % 7,
        order_by_time: "14:00",
      })),
    );
    const info = computeSupplierScheduleInfo({
      schedule: daily,
      leadTimeDays: 3,
      venueToday: SUNDAY,
    });
    expect(info.orderDaysLabel).toBe("any day");
    expect(info.orderByTime).toBe("14:00");
    expect(info.nextDeliveryDate).toBe("2026-07-13");
  });
});
