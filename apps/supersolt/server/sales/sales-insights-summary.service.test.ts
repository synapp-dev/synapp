import { describe, expect, it } from "vitest";

import { zonedTimeToUtcIso } from "./sales-insights-summary.service";

describe("zonedTimeToUtcIso", () => {
  it("converts a Melbourne winter (AEST, UTC+10) day start and end", () => {
    expect(zonedTimeToUtcIso("2026-07-06", "Australia/Melbourne", false)).toBe(
      "2026-07-05T14:00:00.000Z",
    );
    expect(zonedTimeToUtcIso("2026-07-06", "Australia/Melbourne", true)).toBe(
      "2026-07-06T13:59:59.999Z",
    );
  });

  it("converts a Melbourne summer (AEDT, UTC+11) day start", () => {
    expect(zonedTimeToUtcIso("2026-01-15", "Australia/Melbourne", false)).toBe(
      "2026-01-14T13:00:00.000Z",
    );
  });

  it("handles UTC venues", () => {
    expect(zonedTimeToUtcIso("2026-07-06", "UTC", false)).toBe(
      "2026-07-06T00:00:00.000Z",
    );
  });
});
