import { describe, expect, it } from "vitest";

import { checkBearer } from "./cs2-ingest-auth";

const SECRET = "s3cret-token-value";

describe("checkBearer", () => {
  it("fails closed (500) when no secret is configured", () => {
    expect(checkBearer(`Bearer ${SECRET}`, undefined)).toEqual({
      ok: false,
      status: 500,
      error: expect.any(String),
    });
  });

  it("does NOT accept a 'dev-secret' style default when secret is unset", () => {
    // Regression guard for the removed `?? "dev-secret"` fallback.
    const res = checkBearer("Bearer dev-secret", undefined);
    expect(res.ok).toBe(false);
  });

  it("accepts the exact bearer token", () => {
    expect(checkBearer(`Bearer ${SECRET}`, SECRET)).toEqual({ ok: true });
  });

  it("rejects a wrong token of equal length (401)", () => {
    const wrong = "x".repeat(SECRET.length);
    expect(checkBearer(`Bearer ${wrong}`, SECRET)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("rejects a token of different length without throwing (401)", () => {
    expect(checkBearer("Bearer short", SECRET)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("rejects a missing header (401)", () => {
    expect(checkBearer(null, SECRET)).toMatchObject({ ok: false, status: 401 });
  });

  it("rejects a non-Bearer scheme (401)", () => {
    expect(checkBearer(`Basic ${SECRET}`, SECRET)).toMatchObject({
      ok: false,
      status: 401,
    });
  });
});
