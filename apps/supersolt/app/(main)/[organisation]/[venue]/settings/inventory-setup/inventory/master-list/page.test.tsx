import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import { useIngredientsFilterStore } from "@/entities/ingredients/model/store";

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

vi.mock("@/server/ingredients/ingredients.service", () => ({
  ingredientsService: { list: vi.fn() },
}));

vi.mock("@/server/suppliers/suppliers.service", () => ({
  suppliersService: { list: vi.fn() },
}));

vi.mock(
  "@/app/(main)/[organisation]/[venue]/menu/ingredients/_components/ingredients-page-client",
  () => ({
    IngredientsPageClient: () => null,
  })
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { ingredientsService } from "@/server/ingredients/ingredients.service";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import MasterInventoryListPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Mirrors the client's useSuppliersQuery({status:"active", page:1,
 * pageSize:200}) call as the hook maps it into its key filters object.
 */
function clientSuppliersKey(organisation: string, venue: string) {
  return suppliersKeys.list(organisation, venue, {
    search: undefined,
    category: undefined,
    status: "active",
    archived: undefined,
    hasProducts: undefined,
    inventorySource: undefined,
    sort: undefined,
    page: 1,
    pageSize: 200,
  });
}

/**
 * Rebuilds the query key exactly as IngredientsPageClient does on first
 * render: store defaults mapped through the same "all" -> undefined /
 * trim-or-undefined rules as its useIngredientsQuery call. If the store
 * defaults or that mapping ever drift from the page's prefetch constant,
 * the hash comparison below fails and the silent-spinner regression is
 * caught here instead of in production.
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  const state = useIngredientsFilterStore.getState();
  return ingredientsKeys.list(organisation, venue, {
    search: state.search.trim() || undefined,
    category: state.category === "all" ? undefined : state.category,
    status: state.status === "all" ? undefined : state.status,
    supplierId: undefined,
    page: state.page,
    pageSize: state.pageSize,
  });
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await MasterInventoryListPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("MasterInventoryListPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIngredientsFilterStore.getState().reset();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      ingredients: [
        {
          id: "ing-1",
          name: "Tomatoes",
          category: "produce",
          unit: "kg",
          costPerUnitCents: 450,
          bestSupplierCostCents: null,
          currentStockLevel: 3,
          status: "active",
          supplierId: null,
          updatedAt: "2026-07-14T00:00:00.000Z",
        },
      ],
      total: 1,
    };
    vi.mocked(ingredientsService.list).mockResolvedValue(data as never);
    const suppliersData = { suppliers: [], total: 0 };
    vi.mocked(suppliersService.list).mockResolvedValue(suppliersData as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);
    const hashes = state.queries.map((q) => q.queryHash);
    expect(hashes).toContain(hashKey(clientFirstRenderKey("org-1", "ven-1")));
    expect(hashes).toContain(hashKey(clientSuppliersKey("org-1", "ven-1")));
    const ingredientsEntry = state.queries.find(
      (q) => q.queryHash === hashKey(clientFirstRenderKey("org-1", "ven-1"))
    );
    expect(ingredientsEntry!.state.data).toEqual(data);
  });

  it("passes the same filters to the service that the key advertises", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(ingredientsService.list).mockResolvedValue({
      ingredients: [],
      total: 0,
    } as never);
    vi.mocked(suppliersService.list).mockResolvedValue({
      suppliers: [],
      total: 0,
    } as never);

    await renderPageDehydratedState();

    const storeState = useIngredientsFilterStore.getState();
    expect(vi.mocked(ingredientsService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        page: storeState.page,
        pageSize: storeState.pageSize,
        search: undefined,
        category: undefined,
        status: undefined,
      })
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(ingredientsService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(ingredientsService.list).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
