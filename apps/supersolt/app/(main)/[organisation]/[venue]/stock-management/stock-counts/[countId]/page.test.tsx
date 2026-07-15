import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { stockCountKeys } from "@/entities/stock-counts/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/stock-counts/stock-counts.service", () => ({
  stockCountsService: { get: vi.fn() },
}));

vi.mock("@/entities/stock-counts/components/stock-count-detail-page", () => ({
  StockCountDetailPage: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import StockCountDetailRoute from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as StockCountDetailPage does on first
 * render: useStockCountDetailQuery({ organisation, venue, countId }).
 */
function clientFirstRenderKey(
  organisation: string,
  venue: string,
  countId: string,
) {
  return stockCountKeys.detail(organisation, venue, countId);
}

function pageParams() {
  return {
    params: Promise.resolve({
      organisation: "org-1",
      venue: "ven-1",
      countId: "count-1",
    }),
  };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await StockCountDetailRoute(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("StockCountDetailRoute RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      id: "count-1",
      status: "in_progress",
      entries: [{ ingredientId: "ing-1", countedQty: 3 }],
    };
    vi.mocked(stockCountsService.get).mockResolvedValue(data as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1", "count-1")),
    );
    expect(state.queries[0]!.state.data).toEqual(data);
    expect(vi.mocked(stockCountsService.get)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1", countId: "count-1" },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(stockCountsService.get)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(stockCountsService.get).mockRejectedValue(
      new Error("not found"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
