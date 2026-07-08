import { describe, expect, it } from "vitest";
import {
  parseSquareTokenExpiry,
  shouldRefreshSquareToken,
  SQUARE_TOKEN_REFRESH_BUFFER_MS,
} from "@/server/square/token-freshness";

const NOW = Date.parse("2026-07-06T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("parseSquareTokenExpiry", () => {
  it("parses ISO strings", () => {
    expect(parseSquareTokenExpiry("2026-06-23T08:39:26Z")).toBe(
      Date.parse("2026-06-23T08:39:26Z"),
    );
  });

  it("parses the Postgres timestamptz text form", () => {
    // The live row shape: space separator, +00 offset.
    expect(parseSquareTokenExpiry("2026-06-23 08:39:26+00")).toBe(
      Date.parse("2026-06-23T08:39:26+00:00"),
    );
  });

  it("returns null for absent or junk values", () => {
    expect(parseSquareTokenExpiry(null)).toBeNull();
    expect(parseSquareTokenExpiry(undefined)).toBeNull();
    expect(parseSquareTokenExpiry("not a date")).toBeNull();
  });
});

describe("shouldRefreshSquareToken", () => {
  it("refreshes an already-expired token", () => {
    // The live incident: expired 2026-06-23, first API call 2026-07-06.
    expect(shouldRefreshSquareToken("2026-06-23 08:39:26+00", NOW)).toBe(true);
  });

  it("refreshes inside the buffer window", () => {
    const twoDaysOut = new Date(NOW + 2 * DAY_MS).toISOString();
    expect(shouldRefreshSquareToken(twoDaysOut, NOW)).toBe(true);
  });

  it("does not refresh a comfortably-valid token", () => {
    const twentyDaysOut = new Date(NOW + 20 * DAY_MS).toISOString();
    expect(shouldRefreshSquareToken(twentyDaysOut, NOW)).toBe(false);
  });

  it("never refreshes when no expiry is recorded (non-expiring token)", () => {
    expect(shouldRefreshSquareToken(null, NOW)).toBe(false);
    expect(shouldRefreshSquareToken(undefined, NOW)).toBe(false);
  });

  it("refreshes when the stored expiry is unreadable", () => {
    expect(shouldRefreshSquareToken("garbage", NOW)).toBe(true);
  });

  it("boundary: exactly at the buffer edge refreshes", () => {
    const atEdge = new Date(NOW + SQUARE_TOKEN_REFRESH_BUFFER_MS).toISOString();
    expect(shouldRefreshSquareToken(atEdge, NOW)).toBe(true);
  });
});
