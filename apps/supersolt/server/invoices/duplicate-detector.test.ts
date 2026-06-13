import { describe, expect, it } from "vitest";
import { isLikelyDuplicate } from "@/server/invoices/duplicate-detector";

describe("isLikelyDuplicate", () => {
  it("matches same invoice number supplier and total", () => {
    expect(
      isLikelyDuplicate(
        {
          id: "1",
          invoiceNumber: "INV-100",
          supplierName: "Bidfood",
          supplierId: "s1",
          totalCents: 120_000,
        } as never,
        {
          invoiceNumber: "INV-100",
          supplierName: "Bidfood",
          supplierId: "s1",
          totalCents: 120_050,
        },
      ),
    ).toBe(true);
  });

  it("rejects different invoice numbers", () => {
    expect(
      isLikelyDuplicate(
        {
          invoiceNumber: "INV-100",
          supplierName: "Bidfood",
          supplierId: "s1",
          totalCents: 120_000,
        } as never,
        {
          invoiceNumber: "INV-101",
          supplierName: "Bidfood",
          supplierId: "s1",
          totalCents: 120_000,
        },
      ),
    ).toBe(false);
  });
});
