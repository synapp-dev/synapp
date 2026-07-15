import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { xeroKeys } from "@/entities/xero/model/keys";
import { useSuppliersFilterStore } from "@/entities/suppliers/model/store";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/suppliers/suppliers.service", () => ({
  suppliersService: { list: vi.fn() },
}));

vi.mock("@/server/xero/venue-xero-connection", () => ({
  getVenueXeroConnectionSummary: vi.fn(),
}));

vi.mock("@/entities/suppliers/components/suppliers-page", () => ({
  SuppliersPageClient: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import { getVenueXeroConnectionSummary } from "@/server/xero/venue-xero-connection";
import PurchasingSuppliersPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the suppliers query key exactly as SuppliersPageClient does on
 * first render: store defaults mapped through the same "all" -> undefined /
 * trim-or-undefined / yes-no-boolean rules as its useSuppliersQuery call.
 * This page renders without inventorySetupMode, so inventorySource is
 * undefined. If the store defaults or that mapping ever drift from the page's
 * prefetch constant, the hash comparison below fails and the silent-spinner
 * regression is caught here instead of in production.
 */
function clientSuppliersFirstRenderKey(organisation: string, venue: string) {
  const state = useSuppliersFilterStore.getState();
  return suppliersKeys.list(organisation, venue, {
    search: state.search.trim() || undefined,
    category: state.category === "all" ? undefined : state.category,
    status: state.status === "all" ? undefined : state.status,
    archived: state.archived,
    hasProducts:
      state.hasProducts === "yes"
        ? true
        : state.hasProducts === "no"
          ? false
          : undefined,
    inventorySource: undefined,
    sort: state.sort,
    page: state.page,
    pageSize: state.pageSize,
  });
}

function clientXeroConnectionKey(organisation: string, venue: string) {
  return xeroKeys.venueConnection(organisation, venue);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await PurchasingSuppliersPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const SUPPLIERS_DATA = {
  suppliers: [
    {
      id: "sup-1",
      name: "Pacific Fresh Produce",
      category: "produce",
      active: true,
    },
  ],
  total: 1,
};

const XERO_DATA = {
  connected: true,
  tenantId: "tenant-1",
  tenantName: "Piccolo Panini Bar",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

describe("PurchasingSuppliersPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSuppliersFilterStore.getState().reset();
  });

  it("prefetches both queries under the exact keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(suppliersService.list).mockResolvedValue(
      SUPPLIERS_DATA as never
    );
    vi.mocked(getVenueXeroConnectionSummary).mockResolvedValue(
      XERO_DATA as never
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);
    const byHash = new Map(state.queries.map((q) => [q.queryHash, q]));

    const suppliersHash = hashKey(
      clientSuppliersFirstRenderKey("org-1", "ven-1")
    );
    expect(byHash.get(suppliersHash)?.state.data).toEqual(SUPPLIERS_DATA);

    const xeroHash = hashKey(clientXeroConnectionKey("org-1", "ven-1"));
    expect(byHash.get(xeroHash)?.state.data).toEqual(XERO_DATA);
  });

  it("passes the same filters to the services that the keys advertise", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(suppliersService.list).mockResolvedValue({
      suppliers: [],
      total: 0,
    } as never);
    vi.mocked(getVenueXeroConnectionSummary).mockResolvedValue(
      XERO_DATA as never
    );

    await renderPageDehydratedState();

    const storeState = useSuppliersFilterStore.getState();
    expect(vi.mocked(suppliersService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        search: undefined,
        category: undefined,
        status: undefined,
        archived: storeState.archived,
        hasProducts: undefined,
        inventorySource: undefined,
        sort: storeState.sort,
        page: storeState.page,
        pageSize: storeState.pageSize,
      })
    );
    expect(vi.mocked(getVenueXeroConnectionSummary)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" }
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(suppliersService.list)).not.toHaveBeenCalled();
    expect(vi.mocked(getVenueXeroConnectionSummary)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when a service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(suppliersService.list).mockRejectedValue(
      new Error("scope denied")
    );
    vi.mocked(getVenueXeroConnectionSummary).mockResolvedValue(
      XERO_DATA as never
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
