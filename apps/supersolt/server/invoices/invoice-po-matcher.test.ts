import { describe, expect, it } from "vitest";
import { rankPoMatches } from "@/server/invoices/invoice-po-matcher";

describe("rankPoMatches", () => {
  it("auto-matches when total and date align", () => {
    const ranked = rankPoMatches({
      invoice: {
        totalCents: 100_000,
        invoiceDate: "2026-05-20",
        reference: null,
        supplierId: "sup-1",
        supplierName: "Bidfood",
      },
      openPos: [
        {
          id: "po-1",
          supplier_id: "sup-1",
          total_cents: 100_000,
          expected_delivery_date: "2026-05-18",
          po_number: "PO-2026-0001",
          status: "confirmed",
        } as never,
      ],
    });

    expect(ranked[0]?.autoMatched).toBe(true);
    expect(ranked[0]?.po.id).toBe("po-1");
  });
});
