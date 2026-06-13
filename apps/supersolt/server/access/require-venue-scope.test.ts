import { describe, expect, it, vi } from "vitest";

import { AuthError } from "@/server/auth/errors";
import {
  requireVenueScope,
  rethrowVenueScopeError,
  VenueScopeNotFoundError,
} from "@/server/access/require-venue-scope";

describe("requireVenueScope", () => {
  it("throws VenueScopeNotFoundError when venue is missing", async () => {
    const ctx = {
      appDb: {
        rls: vi.fn(async () => null),
      },
      tenantRoles: { organisations: [], venues: [] },
    } as never;

    await expect(requireVenueScope(ctx, "org", "venue")).rejects.toBeInstanceOf(
      VenueScopeNotFoundError,
    );
  });

  it("maps scope errors through rethrowVenueScopeError", () => {
    expect(() =>
      rethrowVenueScopeError(new VenueScopeNotFoundError(), {
        notFound: (message) => new Error(`missing:${message}`),
        forbidden: (auth) => new Error(`forbidden:${auth.message}`),
      }),
    ).toThrow("missing:Venue not found");

    expect(() =>
      rethrowVenueScopeError(new AuthError(403, "Forbidden"), {
        notFound: (message) => new Error(`missing:${message}`),
        forbidden: (auth) => new Error(`forbidden:${auth.message}`),
      }),
    ).toThrow("forbidden:Forbidden");
  });
});
