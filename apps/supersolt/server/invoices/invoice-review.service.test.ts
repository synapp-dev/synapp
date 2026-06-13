import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmInvoice } from "@/server/invoices/invoice-review.service";
import { applyCostPropagation } from "@/server/invoices/invoice-cost-propagation.service";
import { getVenueInvoiceDetail } from "@/server/invoices/invoice-listing.service";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";

vi.mock("@/server/invoices/invoice-shared", () => ({
  resolveInvoiceVenueScope: vi.fn(),
}));

vi.mock("@/server/invoices/invoices.repo", () => ({
  invoicesRepo: {
    getInvoiceById: vi.fn(),
    getInvoiceApprovalThreshold: vi.fn(),
    updateInvoice: vi.fn(),
    insertAudit: vi.fn(),
  },
}));

vi.mock("@/server/invoices/invoice-listing.service", () => ({
  getVenueInvoiceDetail: vi.fn(),
}));

vi.mock("@/server/invoices/invoice-cost-propagation.service", () => ({
  applyCostPropagation: vi.fn(),
}));

function makeCtx() {
  return {
    userId: "user-1",
    appDb: {
      rls: vi.fn(async (callback: (tx: unknown) => unknown) => callback({})),
      admin: {
        update: vi.fn(),
      },
    },
  } as any;
}

describe("confirmInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveInvoiceVenueScope).mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
    } as any);
  });

  it("moves pending review invoices to pending approval at threshold edge", async () => {
    const ctx = makeCtx();
    vi.mocked(invoicesRepo.getInvoiceById).mockResolvedValue({
      id: "inv-1",
      reviewStatus: "pending_review",
      totalCents: 5_000,
      purchaseOrderId: null,
    } as any);
    vi.mocked(invoicesRepo.getInvoiceApprovalThreshold).mockResolvedValue(5_000);
    vi.mocked(getVenueInvoiceDetail).mockResolvedValue({ invoice: { id: "inv-1" } } as any);

    const result = await confirmInvoice(ctx, {
      organisationSlug: "org",
      venueSlug: "venue",
      invoiceId: "inv-1",
    });

    expect(invoicesRepo.updateInvoice).toHaveBeenCalledWith(expect.anything(), "inv-1", {
      reviewStatus: "pending_approval",
    });
    expect(invoicesRepo.insertAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invoiceId: "inv-1",
        eventType: "pending_approval",
      }),
    );
    expect(applyCostPropagation).not.toHaveBeenCalled();
    expect(getVenueInvoiceDetail).toHaveBeenCalledWith(ctx, {
      organisationSlug: "org",
      venueSlug: "venue",
      invoiceId: "inv-1",
    });
    expect(result).toEqual({ invoice: { id: "inv-1" } });
  });
});
