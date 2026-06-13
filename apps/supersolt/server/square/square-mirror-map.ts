import type {
  SalesLineItemRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";
import type {
  VenueSquareOrderLineRow,
  VenueSquarePaymentRow,
} from "@/server/square/square-sync.repo";

export function mirrorPaymentRowToSalesOrder(
  row: VenueSquarePaymentRow,
): SalesOrderRow {
  return {
    id: `sq_${row.squarePaymentId}`,
    order_number: row.orderNumber,
    order_datetime: row.orderDatetime,
    channel: row.channel,
    gross_amount: Number(row.grossAmountCents),
    tax_amount: Number(row.taxAmountCents),
    net_amount: Number(row.netAmountCents),
    discount_amount: Number(row.discountAmountCents),
    is_void: row.isVoid,
    is_refund: row.isRefund,
    refund_reason: row.refundReason,
    payment_method: row.paymentMethod,
    source: "square",
    square: {
      squarePaymentId: row.squarePaymentId,
      status: row.squareStatus ?? undefined,
      sourceType: row.squareSourceType ?? undefined,
      orderId: row.squareOrderId,
      createdAt: row.squareCreatedAt ?? undefined,
      updatedAt: row.squareUpdatedAt ?? undefined,
      locationId: row.squareLocationId ?? undefined,
      receiptUrl: row.receiptUrl ?? undefined,
      receiptNumber: row.receiptNumber ?? undefined,
    },
  };
}

export function mirrorOrderLineRowToSalesLineItem(
  row: VenueSquareOrderLineRow,
): SalesLineItemRow {
  return {
    lineUid: row.squareLineUid,
    quantity: Number(row.quantity),
    lineName: row.lineName ?? "",
    grossAmountCents: Number(row.grossAmountCents),
    currency: row.currency,
    squareCatalogObjectId: row.squareCatalogObjectId,
    menuItemId: row.menuItemId,
    menuItemName: null,
    matchSource: row.matchSource as SalesLineItemRow["matchSource"],
  };
}

export function attachMirrorLinesToOrders(
  orders: SalesOrderRow[],
  lines: VenueSquareOrderLineRow[],
): SalesOrderRow[] {
  const linesByPayment = new Map<string, SalesLineItemRow[]>();
  for (const line of lines) {
    const mapped = mirrorOrderLineRowToSalesLineItem(line);
    const bucket = linesByPayment.get(line.squarePaymentId) ?? [];
    bucket.push(mapped);
    linesByPayment.set(line.squarePaymentId, bucket);
  }

  return orders.map((order) => {
    const paymentId = order.square?.squarePaymentId;
    if (!paymentId) {
      return order;
    }
    const saleLineItems = linesByPayment.get(paymentId);
    if (!saleLineItems?.length) {
      return order;
    }
    return { ...order, saleLineItems };
  });
}

export function mirrorPaymentsToSalesOrders(
  payments: VenueSquarePaymentRow[],
  lines: VenueSquareOrderLineRow[],
): SalesOrderRow[] {
  const orders = payments
    .map(mirrorPaymentRowToSalesOrder)
    .sort(
      (a, b) =>
        new Date(b.order_datetime).getTime() -
        new Date(a.order_datetime).getTime(),
    );
  return attachMirrorLinesToOrders(orders, lines);
}
