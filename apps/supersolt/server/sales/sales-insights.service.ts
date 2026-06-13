import type { RequestAuthContext } from "@/server/auth/context";
import { assertVenueMember } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type { AppDb } from "@/server/db/create-app-db";
import { scopeRepo } from "@/server/db/scope.repo";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import { salesInsightsRepo } from "@/server/sales/sales-insights.repo";
import { buildMockSalesOrders } from "@/entities/sales-insights/model/mock-sales-data";
import {
  mirrorPaymentsToSalesOrders,
} from "@/server/square/square-mirror-map";
import { squareSyncRepo } from "@/server/square/square-sync.repo";
import type {
  SalesInsightsMeta,
  SalesLineItemRow,
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

/** @deprecated Use AuthError */
export class VenueAccessError extends AuthError {}

async function resolveInsightsVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new VenueAccessError(404, message),
    forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
  });
}

export type SalesInsightsOrdersResult = {
  orders: SalesOrderRow[];
  meta: SalesInsightsMeta;
  salesMix: SalesMixRow[];
};

export async function loadSquareConnectionForVenue(
  appDb: AppDb,
  venueId: string,
) {
  return squareConnectionsRepo.loadConnectionForVenue(appDb, venueId, true);
}

function computeSalesMix(orders: SalesOrderRow[]): SalesMixRow[] {
  const acc = new Map<
    string,
    {
      mixKey: string;
      menuItemId: string | null;
      label: string;
      quantity: number;
      revenueCents: number;
      mapped: boolean;
      squareCatalogObjectId: string | null;
      squareLineName: string;
      squareVariationName: string | null;
    }
  >();

  for (const order of orders) {
    if (order.is_void || order.is_refund) continue;
    const lines = order.saleLineItems;
    if (!lines?.length) continue;
    for (const li of lines) {
      const key =
        li.menuItemId ??
        `unmapped::${li.lineName.trim().toLowerCase()}::${li.squareCatalogObjectId ?? ""}`;
      const label = li.menuItemName ?? li.lineName;
      const mapped = li.matchSource !== "unmapped";
      const prev = acc.get(key);
      const qty = li.quantity;
      const rev = li.grossAmountCents;
      if (prev) {
        prev.quantity += qty;
        prev.revenueCents += rev;
      } else {
        acc.set(key, {
          mixKey: key,
          menuItemId: li.menuItemId ?? null,
          label,
          quantity: qty,
          revenueCents: rev,
          mapped,
          squareCatalogObjectId: li.squareCatalogObjectId ?? null,
          squareLineName: li.lineName,
          squareVariationName: li.squareVariationName ?? null,
        });
      }
    }
  }

  return [...acc.values()].sort((a, b) => b.revenueCents - a.revenueCents);
}

async function loadSyncMeta(
  appDb: AppDb,
  venueId: string,
): Promise<Pick<
  SalesInsightsMeta,
  "lastSyncedAt" | "syncStatus" | "backfillStatus"
>> {
  const state = await forecastRepo.getVenueForecastStateAdmin(appDb, venueId);
  if (!state) {
    return { syncStatus: "idle", backfillStatus: "idle" };
  }

  let syncStatus: SalesInsightsMeta["syncStatus"] = "idle";
  if (state.backfillStatus === "running") {
    syncStatus = "syncing";
  } else if (state.backfillStatus === "failed") {
    syncStatus = "failed";
  }

  return {
    lastSyncedAt: state.lastPaymentsSyncAt ?? state.lastDailySalesSyncAt,
    syncStatus,
    backfillStatus: state.backfillStatus as SalesInsightsMeta["backfillStatus"],
  };
}

async function loadOrdersFromMirror(
  appDb: AppDb,
  args: {
    venueId: string;
    startIso: string;
    endIso: string;
  },
): Promise<SalesOrderRow[]> {
  const [payments, lines] = await appDb.rls(async (tx) => {
    const rows = await squareSyncRepo.listPaymentsInRange(tx, {
      venueId: args.venueId,
      startIso: args.startIso,
      endIso: args.endIso,
    });
    const paymentIds = rows.map((p) => p.squarePaymentId);
    const orderLines = await squareSyncRepo.listOrderLinesForPayments(tx, {
      venueId: args.venueId,
      squarePaymentIds: paymentIds,
    });
    return [rows, orderLines] as const;
  });

  const orders = mirrorPaymentsToSalesOrders(payments, lines);

  const { menus } = await appDb.rls((tx) =>
    salesInsightsRepo.loadSquareLineMappingContext(tx, args.venueId),
  );
  const idToName = new Map(menus.map((m) => [m.id, m.name]));

  return orders.map((order) => {
    if (!order.saleLineItems?.length) {
      return order;
    }
    const saleLineItems = order.saleLineItems.map((line) =>
      enrichLineMenuName(line, idToName),
    );
    return { ...order, saleLineItems };
  });
}

function enrichLineMenuName(
  line: SalesLineItemRow,
  idToName: Map<string, string>,
): SalesLineItemRow {
  if (!line.menuItemId || line.menuItemName) {
    return line;
  }
  const name = idToName.get(line.menuItemId);
  return name ? { ...line, menuItemName: name } : line;
}

export async function getSalesInsightsOrders(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    startIso: string;
    endIso: string;
  },
): Promise<SalesInsightsOrdersResult> {
  const context = await resolveInsightsVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const connection = await loadSquareConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );

  if (!connection) {
    const orders = buildMockSalesOrders({
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      startIso: args.startIso,
      endIso: args.endIso,
    });
    return {
      orders,
      meta: { dataSource: "demo", venueTimezone: context.timezone },
      salesMix: computeSalesMix(orders),
    };
  }

  const syncMeta = await loadSyncMeta(ctx.appDb, context.venueId);
  const orders = await loadOrdersFromMirror(ctx.appDb, {
    venueId: context.venueId,
    startIso: args.startIso,
    endIso: args.endIso,
  });

  const meta: SalesInsightsMeta = {
    dataSource: "square",
    venueTimezone: context.timezone,
    ...syncMeta,
  };

  return {
    orders,
    meta,
    salesMix: computeSalesMix(orders),
  };
}

export async function getVenueSquareConnectionSummary(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<{
  connected: boolean;
  merchantId: string | null;
  environment: string | null;
  squareLocationId: string | null;
  locationConfigured: boolean;
  updatedAt: string | null;
}> {
  const context = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, args.organisationSlug, args.venueSlug),
  );
  if (!context) {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      squareLocationId: null,
      locationConfigured: false,
      updatedAt: null,
    };
  }

  try {
    assertVenueMember(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });
  } catch {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      squareLocationId: null,
      locationConfigured: false,
      updatedAt: null,
    };
  }

  const viaRls = await ctx.appDb.rls((tx) =>
    salesInsightsRepo.getConnectionSummaryRls(tx, context.venueId),
  );
  if (viaRls) {
    const squareLocationId = viaRls.squareLocationId?.trim() || null;
    return {
      connected: true,
      merchantId: viaRls.squareMerchantId,
      environment: viaRls.environment,
      squareLocationId,
      locationConfigured: Boolean(squareLocationId),
      updatedAt: viaRls.updatedAt,
    };
  }

  const viaAdmin = await salesInsightsRepo.getConnectionSummaryAdmin(
    ctx.appDb,
    context.venueId,
  );
  if (!viaAdmin) {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      squareLocationId: null,
      locationConfigured: false,
      updatedAt: null,
    };
  }

  const squareLocationId = viaAdmin.squareLocationId?.trim() || null;
  return {
    connected: true,
    merchantId: viaAdmin.squareMerchantId,
    environment: viaAdmin.environment,
    squareLocationId,
    locationConfigured: Boolean(squareLocationId),
    updatedAt: viaAdmin.updatedAt,
  };
}

/** Primary seam for sales insights order payloads (venue + date range). */
export const loadSalesInsightsOrders = getSalesInsightsOrders;
