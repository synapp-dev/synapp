import type { VenueInvoiceDbRow } from "@/server/invoices/invoices.repo";
import type { PoRow } from "@/server/purchase-orders/purchase-orders.repo";

export type PoMatchCandidate = {
  po: PoRow;
  score: number;
  autoMatched: boolean;
};

const AUTO_MATCH_THRESHOLD = 0.75;

function totalProximityScore(invoiceTotal: number, poTotal: number): number {
  if (poTotal <= 0) return 0;
  const diff = Math.abs(invoiceTotal - poTotal) / poTotal;
  if (diff <= 0.05) return 1;
  if (diff <= 0.12) return 0.5;
  return 0;
}

function dateProximityScore(invoiceDate: string | null, expectedDelivery: string | null): number {
  if (!invoiceDate || !expectedDelivery) return 0.3;
  const inv = new Date(invoiceDate).getTime();
  const del = new Date(expectedDelivery).getTime();
  const days = Math.abs(inv - del) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 1;
  if (days <= 14) return 0.5;
  return 0.1;
}

function poNumberHardMatch(reference: string | null, poNumber: string): boolean {
  if (!reference) return false;
  return reference.toUpperCase().includes(poNumber.toUpperCase());
}

export function rankPoMatches(args: {
  invoice: Pick<
    VenueInvoiceDbRow,
    "totalCents" | "invoiceDate" | "reference" | "supplierId" | "supplierName"
  >;
  openPos: PoRow[];
}): PoMatchCandidate[] {
  const candidates: PoMatchCandidate[] = [];

  for (const po of args.openPos) {
    if (args.invoice.supplierId && po.supplier_id !== args.invoice.supplierId) {
      continue;
    }

    if (poNumberHardMatch(args.invoice.reference, po.po_number)) {
      candidates.push({ po, score: 1, autoMatched: true });
      continue;
    }

    const totalScore = totalProximityScore(args.invoice.totalCents, po.total_cents);
    const dateScore = dateProximityScore(args.invoice.invoiceDate, po.expected_delivery_date);
    const score = totalScore * 0.6 + dateScore * 0.4;

    if (score >= 0.4) {
      candidates.push({
        po,
        score,
        autoMatched: score >= AUTO_MATCH_THRESHOLD,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function pickBestPoMatch(
  invoice: Parameters<typeof rankPoMatches>[0]["invoice"],
  openPos: PoRow[],
): PoMatchCandidate | null {
  const ranked = rankPoMatches({ invoice, openPos });
  const best = ranked[0];
  if (!best) return null;
  return best.autoMatched ? best : null;
}
