import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { attachSimilarPendingItems } from "@/server/inventory-normalisation/find-similar-pending-raw-items";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock(
  "@/server/inventory-normalisation/inventory-normalisation.service",
  () => ({
    inventoryNormalisationService: { getQueue: vi.fn() },
  }),
);

vi.mock(
  "@/entities/inventory-normalisation/components/normalisation-wizard-page",
  () => ({
    NormalisationWizardPage: () => null,
  }),
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import InventoryNormaliseWizardPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as NormalisationWizardPage does on first
 * render: useNormalisationQueueQuery({ organisationSlug, venueSlug }) with no
 * search, which the key factory folds to "".
 */
function clientFirstRenderKey(organisation: string, venue: string) {
  return inventoryNormalisationKeys.queue(organisation, venue, undefined);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await InventoryNormaliseWizardPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const queueData = {
  items: [
    {
      id: "raw-1",
      supplierId: "sup-1",
      rawDescription: "Tomatoes 10kg Box",
      lastUnitPriceCents: 4500,
      normalisationStatus: "pending",
    },
  ],
  total: 1,
};

describe("InventoryNormaliseWizardPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(inventoryNormalisationService.getQueue).mockResolvedValue(
      queueData as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "ven-1")),
    );
    // The cache entry must match the client queryFn's transform: items run
    // through attachSimilarPendingItems.
    expect(state.queries[0]!.state.data).toEqual({
      ...queueData,
      items: attachSimilarPendingItems(queueData.items),
    });
    expect(
      (state.queries[0]!.state.data as {
        items: Array<Record<string, unknown>>;
      }).items[0],
    ).toHaveProperty("similarPendingItems");

    expect(
      vi.mocked(inventoryNormalisationService.getQueue),
    ).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", venueSlug: "ven-1", search: undefined },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(
      vi.mocked(inventoryNormalisationService.getQueue),
    ).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(inventoryNormalisationService.getQueue).mockRejectedValue(
      new Error("scope denied"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
