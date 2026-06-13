import { describe, expect, it } from "vitest";
import { mapXeroApiInvoice, mapXeroReviewStatus } from "@/server/xero/xero-invoice-map";

describe("mapXeroReviewStatus", () => {
  it("always returns pending_review for operator workflow", () => {
    expect(mapXeroReviewStatus("PAID")).toBe("pending_review");
    expect(mapXeroReviewStatus("VOIDED")).toBe("pending_review");
    expect(mapXeroReviewStatus("AUTHORISED")).toBe("pending_review");
  });
});

describe("mapXeroApiInvoice", () => {
  it("maps ACCPAY supplier bill", () => {
    const row = mapXeroApiInvoice({
      InvoiceID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      InvoiceNumber: "INV-100",
      Type: "ACCPAY",
      Status: "AUTHORISED",
      Total: 486.5,
      AmountDue: 486.5,
      CurrencyCode: "AUD",
      Date: "2026-03-17T00:00:00",
      Contact: { ContactID: "c1", Name: "FreshCo Produce" },
      UpdatedDateUTC: "/Date(1710633600000+0000)/",
    });

    expect(row).not.toBeNull();
    expect(row?.total_cents).toBe(48650);
    expect(row?.supplier_name).toBe("FreshCo Produce");
    expect(row?.invoice_date).toBe("2026-03-17");
    expect(row?.document_type).toBe("invoice");
    expect(row?.review_status).toBe("pending_review");
  });

  it("skips non-ACCPAY types", () => {
    expect(
      mapXeroApiInvoice({
        InvoiceID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        Type: "ACCREC",
        Total: 10,
      }),
    ).toBeNull();
  });
});
