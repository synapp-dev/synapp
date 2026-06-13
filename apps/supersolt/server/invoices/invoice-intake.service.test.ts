import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadAndParseInvoice } from "@/server/invoices/invoice-intake.service";
import {
  checkAndMarkDuplicate,
  runPoMatchForInvoice,
} from "@/server/invoices/invoice-linking.service";
import {
  fuzzyMatchSupplier,
  fuzzyMatchSupplierProduct,
  mapParsedInvoiceToLineInserts,
  parseInvoiceDocument,
} from "@/server/invoices/invoice-parser.service";
import { uploadInvoiceAttachment } from "@/server/invoices/invoice-storage";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

vi.mock("@/server/invoices/invoice-shared", () => ({
  resolveInvoiceVenueScope: vi.fn(),
}));

vi.mock("@/server/invoices/invoice-parser.service", () => ({
  parseInvoiceDocument: vi.fn(),
  fuzzyMatchSupplier: vi.fn(),
  fuzzyMatchSupplierProduct: vi.fn(),
  mapParsedInvoiceToLineInserts: vi.fn(),
}));

vi.mock("@/server/invoices/invoice-linking.service", () => ({
  checkAndMarkDuplicate: vi.fn(),
  runPoMatchForInvoice: vi.fn(),
}));

vi.mock("@/server/invoices/invoice-storage", () => ({
  uploadInvoiceAttachment: vi.fn(),
}));

vi.mock("@/server/invoices/invoices.repo", () => ({
  invoicesRepo: {
    insertInvoice: vi.fn(),
    insertAttachment: vi.fn(),
    listAttachments: vi.fn(),
    replaceLineItems: vi.fn(),
    updateInvoice: vi.fn(),
    insertAudit: vi.fn(),
  },
}));

vi.mock("@/server/suppliers/suppliers.repo", () => ({
  suppliersRepo: {
    listSuppliers: vi.fn(),
  },
}));

vi.mock("@/server/supplier-products/supplier-products.repo", () => ({
  supplierProductsRepo: {
    listActiveForVenue: vi.fn(),
  },
}));

function makeCtx() {
  return {
    userId: "user-1",
    appDb: {
      rls: vi.fn(async (callback: (tx: unknown) => unknown) => callback({})),
    },
  } as any;
}

describe("uploadAndParseInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveInvoiceVenueScope).mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
    } as any);
    vi.mocked(parseInvoiceDocument).mockResolvedValue({
      parsed: {
        invoiceNumber: "INV-001",
        supplierName: "Acme",
        invoiceDate: "2026-05-01",
        dueDate: "2026-05-15",
        total: 12.34,
        subtotal: 11.22,
        gstTotal: 1.12,
        confidence: "high",
        lineItems: [],
      },
    } as any);
    vi.mocked(suppliersRepo.listSuppliers).mockResolvedValue({ rows: [] } as any);
    vi.mocked(fuzzyMatchSupplier).mockReturnValue(null);
    vi.mocked(mapParsedInvoiceToLineInserts).mockReturnValue([]);
    vi.mocked(fuzzyMatchSupplierProduct).mockReturnValue(null);
    vi.mocked(invoicesRepo.insertInvoice).mockResolvedValue({ id: "inv-123" } as any);
    vi.mocked(uploadInvoiceAttachment).mockResolvedValue({ storagePath: "uploads/inv-123/file.pdf" } as any);
    vi.mocked(invoicesRepo.listAttachments).mockResolvedValue([
      { id: "att-1", storagePath: "uploads/inv-123/file.pdf" },
    ] as any);
    vi.mocked(supplierProductsRepo.listActiveForVenue).mockResolvedValue([]);
  });

  it("returns invoice id after parse and upload pipeline", async () => {
    const ctx = makeCtx();
    const result = await uploadAndParseInvoice(ctx, {
      organisationSlug: "org",
      venueSlug: "venue",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("pdf-bytes"),
    });

    expect(result).toEqual({ invoiceId: "inv-123" });
    expect(parseInvoiceDocument).toHaveBeenCalled();
    expect(uploadInvoiceAttachment).toHaveBeenCalled();
    expect(checkAndMarkDuplicate).toHaveBeenCalledWith(ctx, "inv-123", "venue-1");
    expect(runPoMatchForInvoice).toHaveBeenCalledWith(ctx, "inv-123", "venue-1", "org-1");
  });
});
