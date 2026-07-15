import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { invoiceKeys } from "@/entities/invoices/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/invoices/invoices.service", () => ({
  listVenueInvoices: vi.fn(),
}));

vi.mock("@/entities/invoices/components/invoices-page", () => ({
  InvoicesPageClient: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { listVenueInvoices } from "@/server/invoices/invoices.service";
import PurchasingInvoicesPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query keys exactly as InvoicesShell does on first render: it
 * mounts useVenueInvoicesQuery twice (view "pending_review" for the default
 * tab and view "all" for the other), and the hook keys on
 * invoiceKeys.list(org, venue, view ?? "all"). If the shell's views or the
 * hook's key mapping ever drift from the page's prefetch, the hash comparison
 * below fails and the silent-spinner regression is caught here instead of in
 * production.
 */
function clientFirstRenderKeys(organisation: string, venue: string) {
  return {
    pendingReview: invoiceKeys.list(organisation, venue, "pending_review"),
    all: invoiceKeys.list(organisation, venue, "all"),
  };
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await PurchasingInvoicesPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

const META = {
  xeroConnected: true,
  tenantName: "Piccolo Panini Bar",
  lastSyncAt: null,
  syncError: null,
  pendingReviewCount: 1,
  disputedCount: 0,
  duplicateCount: 0,
  inboxAddress: "ven-1@inbox.supersolt.com",
};

const PENDING_DATA = {
  invoices: [{ id: "inv-1", reviewStatus: "pending_review" }],
  meta: META,
};

const ALL_DATA = {
  invoices: [
    { id: "inv-1", reviewStatus: "pending_review" },
    { id: "inv-2", reviewStatus: "approved" },
  ],
  meta: META,
};

describe("PurchasingInvoicesPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches both views under the exact query keys the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(listVenueInvoices).mockImplementation(async (_ctx, args) =>
      (args.view === "pending_review" ? PENDING_DATA : ALL_DATA) as never
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(2);
    const byHash = new Map(state.queries.map((q) => [q.queryHash, q]));
    const keys = clientFirstRenderKeys("org-1", "ven-1");

    expect(byHash.get(hashKey(keys.pendingReview))?.state.data).toEqual(
      PENDING_DATA
    );
    expect(byHash.get(hashKey(keys.all))?.state.data).toEqual(ALL_DATA);
  });

  it("passes the same views to the service that the keys advertise", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(listVenueInvoices).mockResolvedValue(ALL_DATA as never);

    await renderPageDehydratedState();

    expect(vi.mocked(listVenueInvoices)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(listVenueInvoices)).toHaveBeenCalledWith(
      { userId: "user-1" },
      {
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        view: "pending_review",
      }
    );
    expect(vi.mocked(listVenueInvoices)).toHaveBeenCalledWith(
      { userId: "user-1" },
      {
        organisationSlug: "org-1",
        venueSlug: "ven-1",
        view: "all",
      }
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(vi.mocked(listVenueInvoices)).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(listVenueInvoices).mockRejectedValue(new Error("scope denied"));

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
