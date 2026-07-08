import { describe, expect, it } from "vitest";
import { describeXeroRateLimit } from "./xero-request-queue";

// Fixed instant: 2026-06-26T00:20:00Z → 10:20 AM Mon in Melbourne (UTC+10).
const NOW_MS = Date.UTC(2026, 5, 26, 0, 20, 0);
const TZ = "Australia/Melbourne";

describe("describeXeroRateLimit", () => {
  it("reports the daily reset as an actual local time and relative span", () => {
    // 6h40m from now → 5:00 PM Mon, Melbourne.
    const msg = describeXeroRateLimit({
      retryAfterSeconds: 6 * 3600 + 40 * 60,
      problem: "daily",
      timezone: TZ,
      nowMs: NOW_MS,
    });
    expect(msg).toContain("daily API limit");
    expect(msg).toContain("5:00");
    expect(msg).toContain("in ~6h 40m");
  });

  it("labels a per-minute limit with a minutes-only span", () => {
    const msg = describeXeroRateLimit({
      retryAfterSeconds: 45,
      problem: "minute",
      timezone: TZ,
      nowMs: NOW_MS,
    });
    expect(msg).toContain("per-minute API limit");
    expect(msg).toContain("in ~1m");
  });

  it("degrades gracefully when Retry-After is absent", () => {
    const msg = describeXeroRateLimit({
      retryAfterSeconds: null,
      problem: "daily",
      timezone: TZ,
      nowMs: NOW_MS,
    });
    expect(msg).toContain("daily API limit");
    expect(msg).toContain("try again");
  });

  it("falls back to ISO when the timezone is invalid", () => {
    const msg = describeXeroRateLimit({
      retryAfterSeconds: 120,
      problem: "minute",
      timezone: "Not/AZone",
      nowMs: NOW_MS,
    });
    expect(msg).toContain("2026-06-26T");
  });
});
