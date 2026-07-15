import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { WIZARD_SUPPLIERS_LIST_FILTERS } from "@/entities/suppliers/model/wizard-query-input";

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

vi.mock("@/entities/suppliers/components/supplier-configuration-wizard", () => ({
  SupplierConfigurationWizard: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import InventorySetupSupplierConfigurePage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as SupplierConfigurationWizard does on first
 * render: its useSuppliersQuery call spreads WIZARD_SUPPLIERS_LIST_FILTERS
 * (the shared model constant), and the hook then hashes every filter prop —
 * the ones the wizard doesn't set are undefined and dropped by hashKey. If
 * the wizard's input or the hook's key mapping ever drift from the page's
 * prefetch, the hash comparison below fails and the silent-spinner regression
 * is caught here instead of in production.
 */
function wizardFirstRenderKey(organisation: string, venue: string) {
  return suppliersKeys.list(organisation, venue, {
    search: undefined,
    category: undefined,
    status: WIZARD_SUPPLIERS_LIST_FILTERS.status,
    archived: undefined,
    hasProducts: undefined,
    inventorySource: WIZARD_SUPPLIERS_LIST_FILTERS.inventorySource,
    sort: WIZARD_SUPPLIERS_LIST_FILTERS.sort,
    page: WIZARD_SUPPLIERS_LIST_FILTERS.page,
    pageSize: WIZARD_SUPPLIERS_LIST_FILTERS.pageSize,
  });
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await InventorySetupSupplierConfigurePage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("InventorySetupSupplierConfigurePage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the wizard computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
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
    vi.mocked(suppliersService.list).mockResolvedValue(data as never);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(wizardFirstRenderKey("org-1", "ven-1"))
    );
    expect(state.queries[0]!.state.data).toEqual(data);
  });

  it("passes the same filters to the service that the key advertises, with archived parsed like the API route", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(suppliersService.list).mockResolvedValue({
      suppliers: [],
      total: 0,
    } as never);

    await renderPageDehydratedState();

    expect(vi.mocked(suppliersService.list)).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        search: undefined,
        category: undefined,
        status: WIZARD_SUPPLIERS_LIST_FILTERS.status,
        // parseSuppliersListQuery turns a missing ?archived param into false.
        archived: false,
        hasProducts: undefined,
        inventorySource: WIZARD_SUPPLIERS_LIST_FILTERS.inventorySource,
        sort: WIZARD_SUPPLIERS_LIST_FILTERS.sort,
        page: WIZARD_SUPPLIERS_LIST_FILTERS.page,
        pageSize: WIZARD_SUPPLIERS_LIST_FILTERS.pageSize,
      })
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(suppliersService.list)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(suppliersService.list).mockRejectedValue(
      new Error("scope denied")
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
