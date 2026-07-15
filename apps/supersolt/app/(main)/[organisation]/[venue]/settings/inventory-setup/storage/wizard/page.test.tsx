import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { ingredientsKeys } from "@/entities/ingredients/model/keys";

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

vi.mock("@/server/stock-counts/storage-locations.service", () => ({
  storageLocationsService: { list: vi.fn() },
}));

vi.mock("@/entities/stock-counts/components/stock-levels-wizard-page", () => ({
  StockLevelsWizardPage: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { ingredientsService } from "@/server/ingredients/ingredients.service";
import { storageLocationsService } from "@/server/stock-counts/storage-locations.service";
import StockLevelsWizardRoute from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * The client fires two queries on first render:
 * - useIngredientsQuery({ ...scope, status: "active", page: 1, pageSize: 1000 }),
 *   whose hook builds the key with every optional filter listed (undefined
 *   where unset).
 * - a locations query with an INLINE key, replicated byte-for-byte from
 *   stock-levels-wizard-page.tsx.
 */
function ingredientsClientKey(organisation: string, venue: string) {
  return ingredientsKeys.list(organisation, venue, {
    search: undefined,
    category: undefined,
    status: "active",
    supplierId: undefined,
    page: 1,
    pageSize: 1000,
  });
}

function locationsClientKey(organisation: string, venue: string) {
  return ["stock-wizard", organisation, venue, "locations"];
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await StockLevelsWizardRoute(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const ingredientsData = {
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

const locationsData = [
  { id: "loc-1", name: "Coolroom", displayOrder: 0 },
  { id: "loc-2", name: "Freezer", displayOrder: 1 },
];

describe("StockLevelsWizardRoute RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches both queries under the exact keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(ingredientsService.list).mockResolvedValue(
      ingredientsData as never,
    );
    vi.mocked(storageLocationsService.list).mockResolvedValue(
      locationsData as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);
    const hashes = state.queries.map((q) => q.queryHash);
    expect(hashes).toContain(hashKey(ingredientsClientKey("org-1", "ven-1")));
    expect(hashes).toContain(hashKey(locationsClientKey("org-1", "ven-1")));

    const ingredientsQuery = state.queries.find(
      (q) => q.queryHash === hashKey(ingredientsClientKey("org-1", "ven-1")),
    );
    expect(ingredientsQuery!.state.data).toEqual(ingredientsData);

    const locationsQuery = state.queries.find(
      (q) => q.queryHash === hashKey(locationsClientKey("org-1", "ven-1")),
    );
    expect(locationsQuery!.state.data).toEqual(locationsData);
  });

  it("passes the same filters to the ingredients service that the key advertises", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(ingredientsService.list).mockResolvedValue({
      ingredients: [],
      total: 0,
    } as never);
    vi.mocked(storageLocationsService.list).mockResolvedValue([] as never);

    await renderPageDehydratedState();

    expect(vi.mocked(ingredientsService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        status: "active",
        page: 1,
        pageSize: 1000,
        search: undefined,
        category: undefined,
        supplierId: undefined,
      }),
    );
    expect(vi.mocked(storageLocationsService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(ingredientsService.list)).not.toHaveBeenCalled();
    expect(vi.mocked(storageLocationsService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when a service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(ingredientsService.list).mockResolvedValue({
      ingredients: [],
      total: 0,
    } as never);
    vi.mocked(storageLocationsService.list).mockRejectedValue(
      new Error("scope denied"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
