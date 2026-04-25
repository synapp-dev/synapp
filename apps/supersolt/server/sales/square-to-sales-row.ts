import type { SquarePaymentListItem } from "@/server/square/list-payments";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";

function moneyAmount(m: { amount?: number } | null | undefined): number {
  const n = m?.amount;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function mapSourceTypeToPaymentMethod(sourceType: string | undefined): string | null {
  if (!sourceType) return null;
  const u = sourceType.toUpperCase();
  if (u === "CARD") return "card";
  if (u === "CASH") return "cash";
  if (u === "WALLET" || u === "SQUARE_ACCOUNT" || u === "EXTERNAL") return "digital_wallet";
  return sourceType.toLowerCase().replaceAll("_", " ");
}

function mapSourceTypeToChannel(sourceType: string | undefined): string {
  if (!sourceType) return "pos";
  const u = sourceType.toUpperCase();
  if (u === "CASH") return "pos";
  if (u === "CARD") return "pos";
  return "online";
}

/**
 * Map Square Payment API rows into Sales insights rows (amounts in cents).
 */
export function squarePaymentsToSalesOrderRows(
  payments: SquarePaymentListItem[]
): SalesOrderRow[] {
  const rows: SalesOrderRow[] = [];

  for (const p of payments) {
    const id = p.id;
    if (!id) continue;

    const created = p.created_at ?? p.updated_at;
    if (!created) continue;

    const status = (p.status ?? "").toUpperCase();
    const refunded = moneyAmount(p.refunded_money);
    const gross = moneyAmount(p.total_money) || moneyAmount(p.amount_money);
    const isVoid = status === "CANCELED" || status === "FAILED";
    const isRefund = refunded > 0 && !isVoid;

    let net = gross;
    if (isVoid) {
      net = 0;
    } else if (isRefund) {
      net = -refunded;
    }

    rows.push({
      id: `sq_${id}`,
      order_number: p.order_id ?? id.slice(0, 12),
      order_datetime: created,
      channel: mapSourceTypeToChannel(p.source_type),
      gross_amount: isVoid ? 0 : gross,
      tax_amount: 0,
      net_amount: net,
      discount_amount: 0,
      is_void: isVoid,
      is_refund: isRefund,
      refund_reason: isRefund ? "Square refund" : null,
      payment_method: mapSourceTypeToPaymentMethod(p.source_type),
      source: "square",
      square: {
        squarePaymentId: id,
        status: p.status,
        sourceType: p.source_type,
        orderId: p.order_id ?? null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        amountMoney: p.amount_money,
        totalMoney: p.total_money,
        refundedMoney: p.refunded_money,
        locationId: p.location_id,
        receiptUrl: p.receipt_url,
        receiptNumber: p.receipt_number,
        referenceId: p.reference_id,
        customerId: p.customer_id,
        note: p.note,
      },
    });
  }

  return rows.sort(
    (a, b) => new Date(b.order_datetime).getTime() - new Date(a.order_datetime).getTime()
  );
}
