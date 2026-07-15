import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";

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

vi.mock(
  "@/entities/pos-catalog-import/components/products-recipe-wizard-page",
  () => ({
    ProductsRecipeWizardPage: () => null,
  })
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import ProductsRecipeWizardRoute from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * ProductsRecipeWizardPage's only first-render list query is the POS catalog
 * import list; its key takes no filters, so the guard is simply that the
 * page prefetches under the same key factory the client's
 * usePosCatalogImportQuery uses.
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  return posCatalogImportKeys.list(organisation, venue);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await ProductsRecipeWizardRoute(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("ProductsRecipeWizardRoute RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
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
    vi.mocked(posCatalogImportService.listPosItems).mockResolvedValue(
      data as never
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1"))
    );
    expect(state.queries[0]!.state.data).toEqual(data);
  });

  it("passes the same scope to the service that the key advertises", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(posCatalogImportService.listPosItems).mockResolvedValue({
      rows: [],
      summary: {
        posImportRan: false,
        inUseMenuItemCount: 0,
        mappedInUseCount: 0,
      },
    } as never);

    await renderPageDehydratedState();

    expect(vi.mocked(posCatalogImportService.listPosItems)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" }
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(posCatalogImportService.listPosItems)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(posCatalogImportService.listPosItems).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
