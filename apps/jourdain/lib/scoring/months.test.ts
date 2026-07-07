import { describe, expect, it } from "vitest";
import { addMonths, monthDates, monthEndOf, monthStartOf } from "./months";

describe("monthStartOf", () => {
  it("returns the first of the containing month", () => {
    expect(monthStartOf("2026-07-07")).toBe("2026-07-01");
    expect(monthStartOf("2026-07-01")).toBe("2026-07-01");
    expect(monthStartOf("2026-12-31")).toBe("2026-12-01");
  });
});

describe("addMonths", () => {
  it("shifts by whole months", () => {
    expect(addMonths("2026-07-01", 1)).toBe("2026-08-01");
    expect(addMonths("2026-07-01", -1)).toBe("2026-06-01");
  });

  it("crosses year boundaries in both directions", () => {
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(addMonths("2026-01-01", -13)).toBe("2024-12-01");
    expect(addMonths("2026-07-01", 18)).toBe("2028-01-01");
  });
});

describe("monthEndOf", () => {
  it("returns the last day of the month", () => {
    expect(monthEndOf("2026-07-01")).toBe("2026-07-31");
    expect(monthEndOf("2026-06-01")).toBe("2026-06-30");
  });

  it("handles February and leap years", () => {
    expect(monthEndOf("2026-02-01")).toBe("2026-02-28");
    expect(monthEndOf("2024-02-01")).toBe("2024-02-29");
  });

  it("handles December", () => {
    expect(monthEndOf("2026-12-01")).toBe("2026-12-31");
  });
});

describe("monthDates", () => {
  it("lists every day of the month in order", () => {
    const july = monthDates("2026-07-01");
    expect(july).toHaveLength(31);
    expect(july[0]).toBe("2026-07-01");
    expect(july[30]).toBe("2026-07-31");
  });

  it("matches the month length", () => {
    expect(monthDates("2026-06-01")).toHaveLength(30);
    expect(monthDates("2026-02-01")).toHaveLength(28);
    expect(monthDates("2024-02-01")).toHaveLength(29);
  });
});
