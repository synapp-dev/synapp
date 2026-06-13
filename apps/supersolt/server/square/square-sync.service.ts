import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import type { AppDb } from "@/server/db/create-app-db";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import { salesInsightsRepo } from "@/server/sales/sales-insights.repo";
import {
  buildCatalogObjectToMenuIdMap,
  buildMenuNameIndex,
  resolveSquareOrderLine,
} from "@/server/sales/square-line-resolve";
import { squarePaymentsToSalesOrderRows } from "@/server/sales/square-to-sales-row";
import {
  batchRetrieveSquareOrders,
  type SquareOrderLineDto,
} from "@/server/square/batch-retrieve-orders";
import {
  calendarDatesForOrders,
  recomputeDailySalesForDates,
} from "@/server/square/daily-sales-recompute";
import {
  listSquarePaymentsForVenue,
  type SquarePaymentListItem,
} from "@/server/square/list-payments";
import { rollingSyncIsoRange } from "@/server/square/square-sync-window";
import {
  squareSyncRepo,
  type VenueSquarePaymentInsert,
} from "@/server/square/square-sync.repo";

export type SquareSyncMode = "incremental" | "backfill" | "manual";

export type SquareSyncResult = {
  paymentCount: number;
  lineCount: number;
  daysRecomputed: number;
  truncated: boolean;
};

const SQUARE_BACKFILL_CHUNK_DAYS = 14;
const DEFAULT_BACKFILL_DAYS = 90;
const MANUAL_SYNC_COOLDOWN_MS = 60_000;

export { DEFAULT_BACKFILL_DAYS, MANUAL_SYNC_COOLDOWN_MS };

async function listSquarePaymentsForDateRange(args: {
  accessToken: string;
  storedEnvironment: string;
  locationId: string | null;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<
  | {
      ok: true;
      payments: SquarePaymentListItem[];
      truncated: boolean;
      pagesFetched: number;
    }
  | { ok: false; message: string; status: number }
> {
  const paymentsById = new Map<string, SquarePaymentListItem>();
  let truncated = false;
  let pagesFetched = 0;

  const chunkStart = new Date(args.rangeStart);
  while (chunkStart < args.rangeEnd) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + SQUARE_BACKFILL_CHUNK_DAYS);
    const windowEnd = chunkEnd < args.rangeEnd ? chunkEnd : new Date(args.rangeEnd);

    const listed = await listSquarePaymentsForVenue({
      accessToken: args.accessToken,
      storedEnvironment: args.storedEnvironment,
      beginTime: chunkStart.toISOString(),
      endTime: windowEnd.toISOString(),
      locationId: args.locationId,
    });

    if (!listed.ok) {
      return listed;
    }

    truncated = truncated || listed.truncated;
    pagesFetched += listed.pagesFetched;
    for (const payment of listed.payments) {
      const id = payment.id?.trim();
      if (id) {
        paymentsById.set(id, payment);
      }
    }

    chunkStart.setTime(windowEnd.getTime());
  }

  return {
    ok: true,
    payments: [...paymentsById.values()],
    truncated,
    pagesFetched,
  };
}

function buildLinesByPaymentId(
  payments: SquarePaymentListItem[],
  linesByOrderId: Map<string, SquareOrderLineDto[]>,
): Map<string, SquareOrderLineDto[]> {
  const m = new Map<string, SquareOrderLineDto[]>();
  for (const p of payments) {
    const pid = p.id;
    const oid = p.order_id?.trim();
    if (!pid || !oid) continue;
    const lines = linesByOrderId.get(oid);
    if (lines?.length) {
      m.set(pid, lines);
    }
  }
  return m;
}

function salesOrderToMirrorInsert(
  order: SalesOrderRow,
  ctx: {
    venueId: string;
    organisationId: string;
    observedAt: string;
  },
): VenueSquarePaymentInsert | null {
  const square = order.square;
  if (!square?.squarePaymentId) {
    return null;
  }
  const now = new Date().toISOString();
  return {
    venueId: ctx.venueId,
    organisationId: ctx.organisationId,
    squarePaymentId: square.squarePaymentId,
    squareOrderId: square.orderId ?? null,
    orderDatetime: order.order_datetime,
    orderNumber: order.order_number,
    channel: order.channel,
    grossAmountCents: order.gross_amount,
    taxAmountCents: order.tax_amount,
    netAmountCents: order.net_amount,
    discountAmountCents: order.discount_amount,
    isVoid: order.is_void,
    isRefund: order.is_refund,
    refundReason: order.refund_reason,
    paymentMethod: order.payment_method,
    squareStatus: square.status ?? null,
    squareSourceType: square.sourceType ?? null,
    squareLocationId: square.locationId ?? null,
    receiptUrl: square.receiptUrl ?? null,
    receiptNumber: square.receiptNumber ?? null,
    squareCreatedAt: square.createdAt ?? null,
    squareUpdatedAt: square.updatedAt ?? null,
    observedAt: ctx.observedAt,
    updatedAt: now,
  };
}

async function loadLineMappingContext(appDb: AppDb, venueId: string) {
  const { links, menus } = await salesInsightsRepo.loadSquareLineMappingContextAdmin(
    appDb,
    venueId,
  );
  const catalogByObjectId = buildCatalogObjectToMenuIdMap(
    links.map((l) => ({
      square_catalog_object_id: l.squareCatalogObjectId,
      menu_item_id: l.menuItemId,
    })),
  );
  const { byNormalizedName, idToName } = buildMenuNameIndex(
    menus.map((m) => ({ id: m.id, name: m.name })),
  );
  return { catalogByObjectId, byNormalizedName, idToName };
}

function resolveLineRow(
  line: SquareOrderLineDto,
  catalogByObjectId: Map<string, string>,
  byNormalizedName: Map<string, { id: string; name: string }>,
  idToName: Map<string, string>,
) {
  return resolveSquareOrderLine({
    line,
    catalogByObjectId,
    byNormalizedName,
    idToName,
  });
}

export async function syncSquareSalesForVenue(
  appDb: AppDb,
  args: {
    venueId: string;
    organisationId: string;
    timezone: string;
    accessToken: string;
    environment: string;
    locationId: string | null;
    rangeStart: Date;
    rangeEnd: Date;
    mode: SquareSyncMode;
    dataStartsFrom?: string | null;
  },
): Promise<SquareSyncResult> {
  console.info(
    "[square_sync.started]",
    JSON.stringify({
      venueId: args.venueId,
      mode: args.mode,
      rangeStart: args.rangeStart.toISOString(),
      rangeEnd: args.rangeEnd.toISOString(),
    }),
  );

  const startedAt = Date.now();
  const listed = await listSquarePaymentsForDateRange({
    accessToken: args.accessToken,
    storedEnvironment: args.environment,
    locationId: args.locationId,
    rangeStart: args.rangeStart,
    rangeEnd: args.rangeEnd,
  });

  if (!listed.ok) {
    console.error(
      "[square_sync.failed]",
      JSON.stringify({ venueId: args.venueId, message: listed.message }),
    );
    throw new Error(listed.message);
  }

  if (listed.truncated) {
    console.warn(
      "[square_sync.truncated]",
      JSON.stringify({
        venueId: args.venueId,
        paymentCount: listed.payments.length,
        pagesFetched: listed.pagesFetched,
      }),
    );
  }

  const orders = squarePaymentsToSalesOrderRows(listed.payments);
  const orderIds = [
    ...new Set(
      listed.payments
        .map((p) => p.order_id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const ordersResult = await batchRetrieveSquareOrders({
    accessToken: args.accessToken,
    storedEnvironment: args.environment,
    orderIds,
    locationId: args.locationId,
  });

  const linesByOrderId = ordersResult.ok ? ordersResult.linesByOrderId : new Map();
  const linesByPaymentId = buildLinesByPaymentId(listed.payments, linesByOrderId);

  const observedByPayment = new Map<string, string>();
  for (const p of listed.payments) {
    const id = p.id;
    if (!id) continue;
    observedByPayment.set(
      id,
      p.created_at ?? p.updated_at ?? new Date().toISOString(),
    );
  }

  const now = new Date().toISOString();
  const paymentInserts = orders.flatMap((order) => {
    const pid = order.square?.squarePaymentId;
    if (!pid) return [];
    const insert = salesOrderToMirrorInsert(order, {
      venueId: args.venueId,
      organisationId: args.organisationId,
      observedAt: observedByPayment.get(pid) ?? now,
    });
    return insert ? [insert] : [];
  });

  await squareSyncRepo.upsertPayments(appDb, paymentInserts);

  let lineCount = 0;
  if (linesByPaymentId.size > 0) {
    const { catalogByObjectId, byNormalizedName, idToName } =
      await loadLineMappingContext(appDb, args.venueId);

    const lineInserts: Parameters<
      typeof salesInsightsRepo.upsertSquareOrderLines
    >[1] = [];

    for (const p of listed.payments) {
      const pid = p.id;
      if (!pid) continue;
      const rawLines = linesByPaymentId.get(pid);
      if (!rawLines?.length) continue;
      const observedAt = observedByPayment.get(pid) ?? now;
      for (const line of rawLines) {
        const resolved = resolveLineRow(
          line,
          catalogByObjectId,
          byNormalizedName,
          idToName,
        );
        lineInserts.push({
          venueId: args.venueId,
          organisationId: args.organisationId,
          squarePaymentId: pid,
          squareOrderId: p.order_id?.trim() ?? null,
          squareLineUid: line.lineUid,
          quantity: String(line.quantity),
          lineName: line.lineName,
          squareCatalogObjectId: line.squareCatalogObjectId,
          grossAmountCents: line.grossAmountCents,
          currency: line.currency,
          menuItemId: resolved.menuItemId,
          matchSource: resolved.matchSource,
          observedAt,
          updatedAt: now,
        });
      }
    }

    if (lineInserts.length > 0) {
      await salesInsightsRepo.upsertSquareOrderLines(appDb, lineInserts);
      lineCount = lineInserts.length;
    }
  }

  const affectedDates = calendarDatesForOrders(
    orders.map((o) => o.order_datetime),
    args.timezone,
  );
  const daysRecomputed = await recomputeDailySalesForDates(appDb, {
    venueId: args.venueId,
    timezone: args.timezone,
    dates: affectedDates,
  });

  const syncNow = new Date().toISOString();
  await forecastRepo.upsertVenueForecastState(appDb, {
    venueId: args.venueId,
    lastPaymentsSyncAt: syncNow,
    lastDailySalesSyncAt: syncNow,
    updatedAt: syncNow,
  });

  const { recomputeForecastsForVenue } = await import(
    "@/server/forecast/forecast.service"
  );
  await recomputeForecastsForVenue(appDb, {
    venueId: args.venueId,
    timezone: args.timezone,
    dataStartsFrom: args.dataStartsFrom ?? null,
  });

  console.info(
    "[square_sync.completed]",
    JSON.stringify({
      venueId: args.venueId,
      paymentsUpserted: paymentInserts.length,
      linesUpserted: lineCount,
      daysRecomputed,
      durationMs: Date.now() - startedAt,
    }),
  );

  return {
    paymentCount: paymentInserts.length,
    lineCount,
    daysRecomputed,
    truncated: listed.truncated,
  };
}

export async function runIncrementalSquareSync(
  appDb: AppDb,
  args: {
    venueId: string;
    organisationId: string;
    timezone: string;
    accessToken: string;
    environment: string;
    locationId: string | null;
    dataStartsFrom?: string | null;
  },
): Promise<SquareSyncResult> {
  const { startIso, endIso } = rollingSyncIsoRange(args.timezone);
  return syncSquareSalesForVenue(appDb, {
    ...args,
    rangeStart: new Date(startIso),
    rangeEnd: new Date(endIso),
    mode: "incremental",
  });
}

export async function runBackfillSquareSync(
  appDb: AppDb,
  args: {
    venueId: string;
    organisationId: string;
    timezone: string;
    accessToken: string;
    environment: string;
    locationId: string | null;
    daysBack?: number;
    dataStartsFrom?: string | null;
  },
): Promise<SquareSyncResult & { dayCount: number }> {
  const daysBack = Math.max(1, args.daysBack ?? DEFAULT_BACKFILL_DAYS);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBack);

  await forecastRepo.upsertVenueForecastState(appDb, {
    venueId: args.venueId,
    backfillStatus: "running",
    updatedAt: new Date().toISOString(),
  });

  try {
    const result = await syncSquareSalesForVenue(appDb, {
      venueId: args.venueId,
      organisationId: args.organisationId,
      timezone: args.timezone,
      accessToken: args.accessToken,
      environment: args.environment,
      locationId: args.locationId,
      rangeStart: start,
      rangeEnd: end,
      mode: "backfill",
      dataStartsFrom: args.dataStartsFrom,
    });

    await forecastRepo.upsertVenueForecastState(appDb, {
      venueId: args.venueId,
      backfillStatus: "complete",
      backfillProgress: {
        daysBack,
        orderCount: result.paymentCount,
        dayCount: result.daysRecomputed,
        ...(result.truncated
          ? {
              truncated: true,
              warning:
                "Not all Square payments were imported (pagination safety limit). Re-run sync or narrow the date range.",
            }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { ...result, dayCount: result.daysRecomputed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await forecastRepo.upsertVenueForecastState(appDb, {
      venueId: args.venueId,
      backfillStatus: "failed",
      backfillProgress: { message },
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export function assertManualSyncAllowed(
  lastPaymentsSyncAt: string | null | undefined,
  nowMs = Date.now(),
): void {
  if (!lastPaymentsSyncAt) {
    return;
  }
  const last = new Date(lastPaymentsSyncAt).getTime();
  if (Number.isFinite(last) && nowMs - last < MANUAL_SYNC_COOLDOWN_MS) {
    throw new Error("Square sync cooldown active. Try again in a minute.");
  }
}
