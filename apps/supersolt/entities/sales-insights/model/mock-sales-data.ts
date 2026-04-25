import type { SalesLineItemRow, SalesOrderRow } from "@/entities/sales-insights/model/types";

const demoLineCatalog = [
  { name: "Flat white", cents: 550 },
  { name: "Avo toast", cents: 1850 },
  { name: "Orange juice", cents: 650 },
  { name: "Burger combo", cents: 2200 },
  { name: "Side fries", cents: 600 },
] as const;

type MockSalesOrdersInput = {
  organisationSlug: string;
  venueSlug: string;
  startIso: string;
  endIso: string;
};

const channels = ["dine-in", "takeaway", "delivery", "online"] as const;
const paymentMethods = ["card", "cash", "digital_wallet", "eftpos"] as const;
const refundReasons = [
  "Duplicate transaction",
  "Guest complaint",
  "Cancelled order",
] as const;

function pickFromArray<T>(items: readonly T[], index: number): T {
  const value = items[index % items.length];
  if (value === undefined) {
    return items[0] as T;
  }
  return value;
}

function toIsoDate(daysAgo: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function inDateRange(isoString: string, startIso: string, endIso: string): boolean {
  return isoString >= startIso && isoString <= endIso;
}

function makeOrderId(
  organisationSlug: string,
  venueSlug: string,
  seed: number
): string {
  return `${organisationSlug}-${venueSlug}-${String(seed).padStart(6, "0")}`;
}

export function buildMockSalesOrders({
  organisationSlug,
  venueSlug,
  startIso,
  endIso,
}: MockSalesOrdersInput): SalesOrderRow[] {
  const rows: SalesOrderRow[] = [];
  let orderSeed = 1000;

  for (let dayOffset = 0; dayOffset < 48; dayOffset += 1) {
    for (let slot = 0; slot < 3; slot += 1) {
      const orderDateTime = toIsoDate(dayOffset, 11 + slot * 3, (dayOffset * 7 + slot * 11) % 60);
      if (!inDateRange(orderDateTime, startIso, endIso)) {
        orderSeed += 1;
        continue;
      }

      const grossAmount = 2200 + ((dayOffset * 137 + slot * 293) % 7600);
      const taxAmount = Math.round(grossAmount * 0.1);
      const discountAmount = (dayOffset + slot) % 5 === 0 ? 200 : 0;

      const isVoid = dayOffset % 19 === 0 && slot === 2;
      const isRefund = !isVoid && dayOffset % 13 === 0 && slot === 1;

      let netAmount = grossAmount - taxAmount - discountAmount;
      if (isVoid) {
        netAmount = 0;
      }

      const saleLineItems: SalesLineItemRow[] | undefined =
        isVoid || isRefund
          ? undefined
          : (() => {
              const n = 1 + ((dayOffset + slot) % 3);
              const lines: SalesLineItemRow[] = [];
              let sumCents = 0;
              for (let k = 0; k < n; k += 1) {
                const spec = demoLineCatalog[(dayOffset + slot + k) % demoLineCatalog.length];
                if (!spec) continue;
                const qty = 1 + (k % 2);
                const gross = spec.cents * qty;
                sumCents += gross;
                lines.push({
                  lineUid: `demo-${orderSeed}-${k}`,
                  quantity: qty,
                  lineName: spec.name,
                  grossAmountCents: gross,
                  currency: "AUD",
                  squareCatalogObjectId: null,
                  squareVariationName: null,
                  menuItemId: null,
                  menuItemName: spec.name,
                  matchSource: "name_exact",
                });
              }
              if (sumCents > 0 && lines.length > 0) {
                const scale = grossAmount / sumCents;
                for (const li of lines) {
                  li.grossAmountCents = Math.round(li.grossAmountCents * scale);
                }
              }
              return lines;
            })();

      rows.push({
        id: makeOrderId(organisationSlug, venueSlug, orderSeed),
        order_number: String(4200 + orderSeed),
        order_datetime: orderDateTime,
        channel: pickFromArray(channels, dayOffset + slot),
        gross_amount: isVoid ? 0 : grossAmount,
        tax_amount: isVoid ? 0 : taxAmount,
        net_amount: isVoid ? 0 : netAmount,
        discount_amount: isVoid ? 0 : discountAmount,
        is_void: isVoid,
        is_refund: isRefund,
        refund_reason: isRefund ? pickFromArray(refundReasons, dayOffset + slot) : null,
        payment_method: pickFromArray(paymentMethods, dayOffset * 2 + slot),
        source: "demo",
        saleLineItems,
      });

      orderSeed += 1;
    }
  }

  return rows.sort((left, right) => {
    return (
      new Date(right.order_datetime).getTime() -
      new Date(left.order_datetime).getTime()
    );
  });
}
