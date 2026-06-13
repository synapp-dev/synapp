import { describe, expect, it } from "vitest";

import { mirrorPaymentRowToSalesOrder } from "@/server/square/square-mirror-map";
import type { VenueSquarePaymentRow } from "@/server/square/square-sync.repo";

function basePayment(
  overrides: Partial<VenueSquarePaymentRow> = {},
): VenueSquarePaymentRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    venueId: "22222222-2222-4222-8222-222222222222",
    organisationId: "33333333-3333-4333-8333-333333333333",
    squarePaymentId: "pay_abc",
    squareOrderId: "ord_abc",
    orderDatetime: "2026-06-01T10:00:00.000Z",
    orderNumber: "ord_abc",
    channel: "pos",
    grossAmountCents: 2500,
    taxAmountCents: 0,
    netAmountCents: 2500,
    discountAmountCents: 0,
    isVoid: false,
    isRefund: false,
    refundReason: null,
    paymentMethod: "card",
    squareStatus: "COMPLETED",
    squareSourceType: "CARD",
    squareLocationId: null,
    receiptUrl: null,
    receiptNumber: null,
    squareCreatedAt: "2026-06-01T10:00:00.000Z",
    squareUpdatedAt: "2026-06-01T10:00:00.000Z",
    observedAt: "2026-06-01T10:00:00.000Z",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("mirrorPaymentRowToSalesOrder", () => {
  it("maps payment mirror row to SalesOrderRow", () => {
    const order = mirrorPaymentRowToSalesOrder(basePayment());
    expect(order.id).toBe("sq_pay_abc");
    expect(order.net_amount).toBe(2500);
    expect(order.square?.squarePaymentId).toBe("pay_abc");
  });

  it("maps void payments", () => {
    const order = mirrorPaymentRowToSalesOrder(
      basePayment({ isVoid: true, netAmountCents: 0, grossAmountCents: 0 }),
    );
    expect(order.is_void).toBe(true);
    expect(order.net_amount).toBe(0);
  });
});
