import type { VenueInvoiceDbRow } from "@/server/invoices/invoices.repo";

export function isLikelyDuplicate(
  existing: VenueInvoiceDbRow,
  incoming: {
    invoiceNumber: string | null;
    supplierId: string | null;
    supplierName: string | null;
    totalCents: number;
  },
): boolean {
  if (!incoming.invoiceNumber || !existing.invoiceNumber) return false;
  if (incoming.invoiceNumber.trim().toLowerCase() !== existing.invoiceNumber.trim().toLowerCase()) {
    return false;
  }

  const tolerance = Math.max(100, Math.round(Math.abs(incoming.totalCents) * 0.01));
  if (Math.abs(existing.totalCents - incoming.totalCents) > tolerance) return false;

  if (incoming.supplierId && existing.supplierId) {
    return incoming.supplierId === existing.supplierId;
  }

  if (incoming.supplierName && existing.supplierName) {
    return incoming.supplierName.trim().toLowerCase() === existing.supplierName.trim().toLowerCase();
  }

  return true;
}
