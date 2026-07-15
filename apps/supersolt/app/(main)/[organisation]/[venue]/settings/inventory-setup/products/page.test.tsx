import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { recipesKeys } from "@/entities/recipes/model/keys";
import { squareKeys } from "@/entities/square/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/pos-catalog-import/pos-catalog-import.service", () => ({
  posCatalogImportService: { listPosItems: vi.fn() },
}));

vi.mock("@/server/sales/sales-insights.service", () => ({
  getVenueSquareConnectionSummary: vi.fn(),
}));

vi.mock("@/server/recipes/recipes.service", () => ({
  recipesService: { list: vi.fn() },
}));

vi.mock("@/entities/pos-catalog-import/components/pos-catalog-import-page", () => ({
  PosCatalogImportPage: () => null,
}));

vi.mock(
  "@/entities/pos-catalog-import/components/pos-catalog-import-provider",
  () => ({
    PosCatalogImportProvider: ({ children }: { children?: unknown }) =>
      children ?? null,
  })
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { getVenueSquareConnectionSummary } from "@/server/sales/sales-insights.service";
import { recipesService } from "@/server/recipes/recipes.service";
import PosItemsPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the three query keys exactly as PosCatalogImportPage computes them
 * on first render: the POS list and Square connection keys take no filters,
 * and the recipes lookup uses literal values (page 1, size 500) that
 * useRecipesQuery spreads into the key alongside undefined filters. If any of
 * these ever drift from the page's prefetch, the hash comparisons below fail
 * and the silent-spinner regression is caught here instead of in production.
 */
function clientPosListKey(organisation: string, venue: string) {
  return posCatalogImportKeys.list(organisation, venue);
}

function clientSquareConnectionKey(organisation: string, venue: string) {
  return squareKeys.venueConnection(organisation, venue);
}

function clientRecipesFirstRenderKey(organisation: string, venue: string) {
  return recipesKeys.list(organisation, venue, {
    search: undefined,
    category: undefined,
    status: undefined,
    page: 1,
    pageSize: 500,
  });
}

const POS_ITEMS_DATA = {
  rows: [
    {
      menuItemId: "mi-1",
      name: "ICED LATTE",
      sectionName: "COFFEE",
      groupId: null,
      groupName: null,
      description: null,
      priceCents: 650,
      inUse: true,
      recipeId: null,
    },
  ],
  summary: {
    posImportRan: true,
    inUseMenuItemCount: 1,
    mappedInUseCount: 0,
  },
};

const SQUARE_SUMMARY = {
  connected: true,
  merchantId: "M123",
  environment: "production",
  squareLocationId: "L456",
  locationConfigured: true,
  updatedAt: "2026-07-14T00:00:00.000Z",
};

const RECIPES_DATA = {
  recipes: [
    {
      id: "rec-1",
      name: "Iced Latte",
      category: "drinks",
      serves: 1,
      costPerServe: 120,
      suggestedPrice: 650,
      gpPercent: 81.5,
      status: "published",
    },
  ],
  total: 1,
};

function mockAllServicesResolved() {
  vi.mocked(posCatalogImportService.listPosItems).mockResolvedValue(
    POS_ITEMS_DATA as never
  );
  vi.mocked(getVenueSquareConnectionSummary).mockResolvedValue(
    SQUARE_SUMMARY as never
  );
  vi.mocked(recipesService.list).mockResolvedValue(RECIPES_DATA as never);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await PosItemsPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("PosItemsPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches all three queries under the exact keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    mockAllServicesResolved();

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(3);

    const posListHash = hashKey(clientPosListKey("org-1", "ven-1"));
    const squareHash = hashKey(clientSquareConnectionKey("org-1", "ven-1"));
    const recipesHash = hashKey(clientRecipesFirstRenderKey("org-1", "ven-1"));

    const posListQuery = state.queries.find(
      (query) => query.queryHash === posListHash
    );
    const squareQuery = state.queries.find(
      (query) => query.queryHash === squareHash
    );
    const recipesQuery = state.queries.find(
      (query) => query.queryHash === recipesHash
    );

    expect(posListQuery).toBeDefined();
    expect(posListQuery!.state.data).toEqual(POS_ITEMS_DATA);
    expect(squareQuery).toBeDefined();
    expect(squareQuery!.state.data).toEqual(SQUARE_SUMMARY);
    expect(recipesQuery).toBeDefined();
    expect(recipesQuery!.state.data).toEqual(RECIPES_DATA);
  });

  it("passes the same inputs to the services that the keys advertise", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    mockAllServicesResolved();

    await renderPageDehydratedState();

    expect(vi.mocked(posCatalogImportService.listPosItems)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" }
    );
    expect(vi.mocked(getVenueSquareConnectionSummary)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" }
    );
    expect(vi.mocked(recipesService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        search: undefined,
        category: undefined,
        status: undefined,
        page: 1,
        pageSize: 500,
      })
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(posCatalogImportService.listPosItems)).not.toHaveBeenCalled();
    expect(vi.mocked(getVenueSquareConnectionSummary)).not.toHaveBeenCalled();
    expect(vi.mocked(recipesService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when a service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    mockAllServicesResolved();
    vi.mocked(getVenueSquareConnectionSummary).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
