import { describe, expect, it, vi, beforeEach } from "vitest";

import type { RequestAuthContext } from "@/server/auth/context";

vi.mock("@/server/access/require-venue-scope", () => ({
  resolveVenueScopeForService: vi.fn(),
}));

vi.mock("@/server/square/square-connections.repo", () => ({
  squareConnectionsRepo: {
    loadConnectionForVenue: vi.fn(),
  },
}));

vi.mock("@/server/square/list-payments", () => ({
  listSquarePaymentsForVenue: vi.fn(),
}));

import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import {
  getSalesInsightsOrders,
  loadSalesInsightsOrders,
  VenueAccessError,
} from "@/server/sales/sales-insights.service";

const venueScope = {
  organisationId: "org-1",
  venueId: "venue-1",
  organisationSlug: "acme",
  venueSlug: "main",
  timezone: "Australia/Melbourne",
};

const mockCtx = {
  appDb: {},
  tenantRoles: [],
  userId: "user-1",
} as unknown as RequestAuthContext;

describe("getSalesInsightsOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveVenueScopeForService).mockResolvedValue(venueScope);
  });

  it("returns demo orders when Square is not connected", async () => {
    vi.mocked(squareConnectionsRepo.loadConnectionForVenue).mockResolvedValue(
      null,
    );

    const result = await getSalesInsightsOrders(mockCtx, {
      organisationSlug: "acme",
      venueSlug: "main",
      startIso: "2026-05-01T00:00:00.000Z",
      endIso: "2026-05-07T23:59:59.999Z",
    });

    expect(result.meta.dataSource).toBe("demo");
    expect(result.meta.venueTimezone).toBe("Australia/Melbourne");
    expect(result.orders.length).toBeGreaterThan(0);
    expect(result.salesMix.length).toBeGreaterThan(0);
  });

  it("throws VenueAccessError when venue scope is denied", async () => {
    vi.mocked(resolveVenueScopeForService).mockRejectedValue(
      new VenueAccessError(403, "Forbidden"),
    );

    await expect(
      getSalesInsightsOrders(mockCtx, {
        organisationSlug: "acme",
        venueSlug: "main",
        startIso: "2026-05-01T00:00:00.000Z",
        endIso: "2026-05-07T23:59:59.999Z",
      }),
    ).rejects.toBeInstanceOf(VenueAccessError);
  });

  it("exposes loadSalesInsightsOrders as the primary seam alias", () => {
    expect(loadSalesInsightsOrders).toBe(getSalesInsightsOrders);
  });
});
