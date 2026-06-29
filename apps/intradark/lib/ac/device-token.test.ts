import { describe, expect, it } from "vitest";

import {
  generateDeviceToken,
  hashDeviceToken,
  parseBearer,
} from "@/lib/ac/device-token";

describe("generateDeviceToken", () => {
  it("produces unique url-safe tokens", () => {
    const a = generateDeviceToken();
    const b = generateDeviceToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
});

describe("hashDeviceToken", () => {
  it("is deterministic and a 64-char hex digest", () => {
    expect(hashDeviceToken("tok")).toBe(hashDeviceToken("tok"));
    expect(hashDeviceToken("tok")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different tokens", () => {
    expect(hashDeviceToken("a")).not.toBe(hashDeviceToken("b"));
  });
});

describe("parseBearer", () => {
  it("extracts the token from a Bearer header", () => {
    expect(parseBearer("Bearer abc123")).toBe("abc123");
  });

  it("returns null for missing or malformed headers", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("")).toBeNull();
    expect(parseBearer("abc123")).toBeNull();
    expect(parseBearer("Basic abc123")).toBeNull();
    expect(parseBearer("Bearer ")).toBeNull();
    expect(parseBearer("Bearer    ")).toBeNull();
  });
});
