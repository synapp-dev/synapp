import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";

vi.mock("@/server/readiness/assert-venue-readiness", () => ({
  assertVenueReadinessOrRedirect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/purchase-orders/order-guide.service", () => ({
  orderGuideService: { get: vi.fn() },
}));

vi.mock("@/entities/purchase-orders/components/orders-page", () => ({
  OrdersPageClient: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { orderGuideService } from "@/server/purchase-orders/order-guide.service";
import PurchasingOrdersPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as OrderGuideTab does on first render: its
 * period useState defaults to "7d" and useOrderGuideQuery keys on
 * purchaseOrderKeys.orderGuide(org, venue, period) — just the preset string.
 * If the tab's default period or the key factory ever drift from the page's
 * prefetch constant, the hash comparison below fails and the silent-spinner
 * regression is caught here instead of in production.
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  return purchaseOrderKeys.orderGuide(organisation, venue, "7d");
}

function pageProps(searchParams: { tab?: string } = {}) {
  return {
    params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }),
    searchParams: Promise.resolve(searchParams),
  };
}

async function renderPageDehydratedState(
  searchParams: { tab?: string } = {}
): Promise<DehydratedQueries> {
  const element = await PurchasingOrdersPage(pageProps(searchParams));
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const GUIDE_DATA = {
  computedAt: "2026-07-14T00:00:00.000Z",
  forecastReady: true,
  forecastHorizonDays: 7,
  periodPreset: "7d",
  coldStart: false,
  stockCountMissing: false,
  noSupplierProducts: false,
  suggestionsBySupplier: [],
};

describe("PurchasingOrdersPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches the order guide under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(orderGuideService.get).mockResolvedValue(GUIDE_DATA as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1"))
    );
    expect(state.queries[0]!.state.data).toEqual(GUIDE_DATA);
  });

  it("passes the same period preset to the service that the key advertises, without forcing a refresh", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(orderGuideService.get).mockResolvedValue(GUIDE_DATA as never);

    await renderPageDehydratedState();

    expect(vi.mocked(orderGuideService.get)).toHaveBeenCalledWith(
      { userId: "user-1" },
      {
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        periodPreset: "7d",
        forceRefresh: false,
      }
    );
  });

  it("skips the prefetch entirely when ?tab=purchase-orders resolves to the other tab", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(orderGuideService.get).mockResolvedValue(GUIDE_DATA as never);

    const state = await renderPageDehydratedState({ tab: "purchase-orders" });

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(orderGuideService.get)).not.toHaveBeenCalled();
  });

  it("still prefetches when ?tab holds an unknown value (falls back to the guide tab)", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(orderGuideService.get).mockResolvedValue(GUIDE_DATA as never);

    const state = await renderPageDehydratedState({ tab: "bogus" });

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1"))
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(orderGuideService.get)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(orderGuideService.get).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
