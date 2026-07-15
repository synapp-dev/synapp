import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { menuItemsKeys } from "@/entities/menu-items/model/keys";
import { useMenuItemsFilterStore } from "@/entities/menu-items/model/store";
import { recipesKeys } from "@/entities/recipes/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/menu-items/menu-items.service", () => ({
  menuItemsService: { list: vi.fn() },
}));

vi.mock("@/server/recipes/recipes.service", () => ({
  recipesService: { list: vi.fn() },
}));

vi.mock(
  "@/app/(main)/[organisation]/[venue]/menu/menu-items/_components/menu-items-page-client",
  () => ({
    MenuItemsPageClient: () => null,
  })
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { menuItemsService } from "@/server/menu-items/menu-items.service";
import { recipesService } from "@/server/recipes/recipes.service";
import MenuItemsPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the menu-items query key exactly as MenuItemsPageClient does on
 * first render: store defaults mapped through the same trim-or-undefined /
 * "all" -> undefined rules as its useMenuItemsQuery call. If the store
 * defaults or that mapping ever drift from the page's prefetch constant, the
 * hash comparison below fails and the silent-spinner regression is caught
 * here instead of in production.
 */
function clientMenuItemsFirstRenderKey(organisation: string, venue: string) {
  const state = useMenuItemsFilterStore.getState();
  return menuItemsKeys.list(organisation, venue, {
    search: state.search.trim() || undefined,
    sectionName: state.sectionName === "all" ? undefined : state.sectionName,
    page: state.page,
    pageSize: state.pageSize,
  });
}

/**
 * MenuItemsPageClient's recipes lookup uses literal values (page 1, size 200)
 * rather than a store; useRecipesQuery spreads the remaining filters as
 * undefined into the key.
 */
function clientRecipesFirstRenderKey(organisation: string, venue: string) {
  return recipesKeys.list(organisation, venue, {
    search: undefined,
    category: undefined,
    status: undefined,
    page: 1,
    pageSize: 200,
  });
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await MenuItemsPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("MenuItemsPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMenuItemsFilterStore.getState().reset();
  });

  it("prefetches both queries under the exact keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const menuItemsData = {
      menuItems: [
        {
          id: "mi-1",
          name: "Chicken Panini",
          sectionName: "Paninis",
          tags: [],
          priceMode: "MANUAL",
          priceCents: 1450,
          gstMode: "INC",
          costPerServeCents: 480,
          gpPercent: 66.9,
          pluCode: "101",
          showOnMenu: true,
          status: "active",
          recipeSummary: "Chicken Panini",
        },
      ],
      total: 1,
      sections: ["Paninis"],
    };
    const recipesData = {
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
    vi.mocked(menuItemsService.list).mockResolvedValue(menuItemsData as never);
    vi.mocked(recipesService.list).mockResolvedValue(recipesData as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);

    const menuItemsHash = hashKey(
      clientMenuItemsFirstRenderKey("org-1", "ven-1")
    );
    const recipesHash = hashKey(clientRecipesFirstRenderKey("org-1", "ven-1"));

    const menuItemsQuery = state.queries.find(
      (query) => query.queryHash === menuItemsHash
    );
    const recipesQuery = state.queries.find(
      (query) => query.queryHash === recipesHash
    );

    expect(menuItemsQuery).toBeDefined();
    expect(menuItemsQuery!.state.data).toEqual(menuItemsData);
    expect(recipesQuery).toBeDefined();
    expect(recipesQuery!.state.data).toEqual(recipesData);
  });

  it("passes the same filters to the services that the keys advertise", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(menuItemsService.list).mockResolvedValue({
      menuItems: [],
      total: 0,
      sections: [],
    } as never);
    vi.mocked(recipesService.list).mockResolvedValue({
      recipes: [],
      total: 0,
    } as never);

    await renderPageDehydratedState();

    const storeState = useMenuItemsFilterStore.getState();
    expect(vi.mocked(menuItemsService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        search: undefined,
        sectionName: undefined,
        page: storeState.page,
        pageSize: storeState.pageSize,
      })
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
        pageSize: 200,
      })
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(menuItemsService.list)).not.toHaveBeenCalled();
    expect(vi.mocked(recipesService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when a service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(menuItemsService.list).mockRejectedValue(
      new Error("scope denied")
    );
    vi.mocked(recipesService.list).mockResolvedValue({
      recipes: [],
      total: 0,
    } as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
