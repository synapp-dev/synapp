import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { recipesKeys } from "@/entities/recipes/model/keys";
import { useRecipesFilterStore } from "@/entities/recipes/model/store";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/recipes/recipes.service", () => ({
  recipesService: { list: vi.fn() },
}));

vi.mock(
  "@/app/(main)/[organisation]/[venue]/menu/recipes/_components/recipes-page-client",
  () => ({
    RecipesPageClient: () => null,
  })
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { recipesService } from "@/server/recipes/recipes.service";
import InventorySetupRecipesPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as RecipesPageClient does on first render:
 * store defaults mapped through the same trim-or-undefined / "all" ->
 * undefined rules as its useRecipesQuery call. If the store defaults or that
 * mapping ever drift from the page's prefetch constant, the hash comparison
 * below fails and the silent-spinner regression is caught here instead of in
 * production.
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  const state = useRecipesFilterStore.getState();
  return recipesKeys.list(organisation, venue, {
    search: state.search.trim() || undefined,
    category: state.category === "all" ? undefined : state.category,
    status: state.status === "all" ? undefined : state.status,
    page: state.page,
    pageSize: state.pageSize,
  });
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await InventorySetupRecipesPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("InventorySetupRecipesPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRecipesFilterStore.getState().reset();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      recipes: [
        {
          id: "rec-1",
          name: "Chicken Panini",
          category: "mains",
          serves: 1,
          costPerServe: 480,
          suggestedPrice: 1450,
          gpPercent: 66.9,
          status: "published",
        },
      ],
      total: 1,
    };
    vi.mocked(recipesService.list).mockResolvedValue(data as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1"))
    );
    expect(state.queries[0]!.state.data).toEqual(data);
  });

  it("passes the same filters to the service that the key advertises", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(recipesService.list).mockResolvedValue({
      recipes: [],
      total: 0,
    } as never);

    await renderPageDehydratedState();

    const storeState = useRecipesFilterStore.getState();
    expect(vi.mocked(recipesService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        search: undefined,
        category: undefined,
        status: undefined,
        page: storeState.page,
        pageSize: storeState.pageSize,
      })
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(recipesService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(recipesService.list).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
