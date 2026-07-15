import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
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

vi.mock("@/server/inventory-setup/inventory-setup.service", () => ({
  inventorySetupService: { getProgress: vi.fn() },
}));

vi.mock(
  "@/server/inventory-normalisation/inventory-normalisation.service",
  () => ({
    inventoryNormalisationService: { getQueue: vi.fn() },
  }),
);

vi.mock(
  "@/entities/inventory-normalisation/components/normalisation-queue-page",
  () => ({
    NormalisationQueuePage: () => null,
  }),
);

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import InventorySetupNormalisePage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * The client fires two queries on first render:
 * - useInventorySetupProgressQuery({ organisationSlug, venueSlug })
 * - useNormalisationQueueQuery with search "" trimmed to undefined, which the
 *   key factory folds to "".
 */
function progressKey(organisation: string, venue: string) {
  return inventorySetupKeys.progress(organisation, venue);
}

function queueKey(organisation: string, venue: string) {
  return inventoryNormalisationKeys.queue(organisation, venue, undefined);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await InventorySetupNormalisePage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const progressData = {
  stages: { suppliers: "complete", inventory: "in_progress" },
};

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

describe("InventorySetupNormalisePage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches both queries under the exact keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(inventorySetupService.getProgress).mockResolvedValue(
      progressData as never,
    );
    vi.mocked(inventoryNormalisationService.getQueue).mockResolvedValue(
      queueData as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);
    const hashes = state.queries.map((q) => q.queryHash);
    expect(hashes).toContain(hashKey(progressKey("org-1", "ven-1")));
    expect(hashes).toContain(hashKey(queueKey("org-1", "ven-1")));

    const progressQuery = state.queries.find(
      (q) => q.queryHash === hashKey(progressKey("org-1", "ven-1")),
    );
    expect(progressQuery!.state.data).toEqual(progressData);

    // The queue cache entry must match the client queryFn's transform:
    // items run through attachSimilarPendingItems.
    const queueQuery = state.queries.find(
      (q) => q.queryHash === hashKey(queueKey("org-1", "ven-1")),
    );
    expect(queueQuery!.state.data).toEqual({
      ...queueData,
      items: attachSimilarPendingItems(queueData.items),
    });
    expect(
      (queueQuery!.state.data as { items: Array<Record<string, unknown>> })
        .items[0],
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
      vi.mocked(inventorySetupService.getProgress),
    ).not.toHaveBeenCalled();
    expect(
      vi.mocked(inventoryNormalisationService.getQueue),
    ).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when a service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(inventorySetupService.getProgress).mockResolvedValue(
      progressData as never,
    );
    vi.mocked(inventoryNormalisationService.getQueue).mockRejectedValue(
      new Error("scope denied"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
