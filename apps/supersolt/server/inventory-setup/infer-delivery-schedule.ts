import { and, eq, isNull, or, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { suppliers, venueInvoices } from "@/server/db/schema";
import type { Json } from "@/utils/supabase/types";
import { getDefaultDeliverySchedule } from "@/entities/suppliers/model/schedule-types";
import type { DeliveryScheduleEntry } from "@/entities/suppliers/model/schedule-types";
import {
  parseDeliverySchedule,
  serializeDeliverySchedule,
} from "@/server/suppliers/supplier-schedule";

const MIN_INVOICES_FOR_INFERENCE = 3;

function isDefaultEmptySchedule(schedule: DeliveryScheduleEntry[]): boolean {
  const defaults = getDefaultDeliverySchedule();
  return schedule.every(
    (entry, index) =>
      entry.is_order_day === defaults[index]?.is_order_day &&
      !entry.order_by_time &&
      entry.delivery_day == null,
  );
}

function weekdayFromDate(dateStr: string): number | null {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDay();
}

function applySuggestedOrderDays(
  schedule: DeliveryScheduleEntry[],
  orderDays: Set<number>,
): DeliveryScheduleEntry[] {
  return schedule.map((entry) => {
    if (!orderDays.has(entry.day)) {
      return entry;
    }
    return {
      ...entry,
      is_order_day: true,
      delivery_day: entry.delivery_day ?? ((entry.day + 1) % 7),
    };
  });
}

export async function inferDeliverySchedulesFromInvoices(
  tx: RlsTx,
  args: { organisationId: string; venueId: string },
): Promise<number> {
  const invoiceRows = await tx
    .select({
      supplierId: venueInvoices.supplierId,
      invoiceDate: venueInvoices.invoiceDate,
    })
    .from(venueInvoices)
    .where(
      and(
        eq(venueInvoices.organisationId, args.organisationId),
        eq(venueInvoices.venueId, args.venueId),
        sql`${venueInvoices.supplierId} IS NOT NULL`,
        sql`${venueInvoices.invoiceDate} IS NOT NULL`,
      ),
    );

  const bySupplier = new Map<string, string[]>();
  for (const row of invoiceRows) {
    if (!row.supplierId || !row.invoiceDate) continue;
    const list = bySupplier.get(row.supplierId) ?? [];
    list.push(row.invoiceDate);
    bySupplier.set(row.supplierId, list);
  }

  let suppliersSuggested = 0;

  for (const [supplierId, dates] of bySupplier) {
    if (dates.length < MIN_INVOICES_FOR_INFERENCE) continue;

    const supplierRows = await tx
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
          or(isNull(suppliers.venueId), eq(suppliers.venueId, args.venueId))!,
        ),
      )
      .limit(1);

    const supplier = supplierRows[0];
    if (!supplier) continue;

    const current = parseDeliverySchedule(supplier.deliverySchedule as Json);
    if (!isDefaultEmptySchedule(current)) continue;

    const orderDays = new Set<number>();
    for (const date of dates) {
      const weekday = weekdayFromDate(date);
      if (weekday != null) orderDays.add(weekday);
    }
    if (orderDays.size === 0) continue;

    const next = applySuggestedOrderDays(current, orderDays);
    await tx
      .update(suppliers)
      .set({
        deliverySchedule: serializeDeliverySchedule(next),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(suppliers.id, supplierId));

    suppliersSuggested += 1;
  }

  return suppliersSuggested;
}
