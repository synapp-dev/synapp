import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { stockCountKeys } from "@/entities/stock-counts/model/keys";

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

vi.mock("@/server/stock-counts/stock-counts.service", () => ({
  stockCountsService: { list: vi.fn() },
}));

vi.mock("@/entities/stock-counts/components/stock-counts-list-page", () => ({
  StockCountsListPage: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import StockCountsPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as StockCountsListPage does on first render:
 * useStockCountsQuery({ organisation, venue }) with no status, which the key
 * factory folds to "all".
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  return stockCountKeys.list(organisation, venue, undefined);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await StockCountsPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("StockCountsPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      counts: [
        {
          id: "count-1",
          status: "in_progress",
          scopeType: "full",
          startedAt: "2026-07-14T00:00:00.000Z",
          varianceValueCents: null,
        },
      ],
      activeIngredientCount: 12,
    };
    vi.mocked(stockCountsService.list).mockResolvedValue(data as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1")),
    );
    expect(state.queries[0]!.state.data).toEqual(data);
  });

  it("passes the same scope to the service that the key advertises", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(stockCountsService.list).mockResolvedValue({
      counts: [],
      activeIngredientCount: 0,
    } as never);

    await renderPageDehydratedState();

    expect(vi.mocked(stockCountsService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      {
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        // The client sends no status; the API route defaults it to "all".
        status: "all",
      },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(stockCountsService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(stockCountsService.list).mockRejectedValue(
      new Error("scope denied"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
