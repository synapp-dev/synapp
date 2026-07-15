import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/inventory-setup/inventory-setup.service", () => ({
  inventorySetupService: { getProgress: vi.fn() },
}));

vi.mock(
  "@/entities/inventory-setup/components/wizard/inventory-setup-wizard",
  () => ({
    InventorySetupWizard: () => null,
  }),
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import InventorySetupIndexPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as InventorySetupWizard does on first
 * render: useInventorySetupProgressQuery({ organisationSlug, venueSlug }).
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  return inventorySetupKeys.progress(organisation, venue);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await InventorySetupIndexPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("InventorySetupIndexPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      stages: { suppliers: "complete", inventory: "in_progress" },
      wizardState: { welcomeSeen: true },
    };
    vi.mocked(inventorySetupService.getProgress).mockResolvedValue(
      data as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1")),
    );
    expect(state.queries[0]!.state.data).toEqual(data);
    expect(vi.mocked(inventorySetupService.getProgress)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1" },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(
      vi.mocked(inventorySetupService.getProgress),
    ).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(inventorySetupService.getProgress).mockRejectedValue(
      new Error("scope denied"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
