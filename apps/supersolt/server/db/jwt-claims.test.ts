import { describe, expect, it } from "vitest";

import { supabaseClaimsFromJwtPayload } from "@/server/db/jwt-claims";

describe("supabaseClaimsFromJwtPayload", () => {
  it("defaults role to authenticated", () => {
    expect(supabaseClaimsFromJwtPayload({ sub: "user-1" })).toEqual({
      sub: "user-1",
      role: "authenticated",
    });
  });

  it("preserves explicit role and subject", () => {
    expect(
      supabaseClaimsFromJwtPayload({
        sub: "user-2",
        role: "service_role",
        email: "a@example.com",
      }),
    ).toMatchObject({
      sub: "user-2",
      role: "service_role",
      email: "a@example.com",
    });
  });
});
