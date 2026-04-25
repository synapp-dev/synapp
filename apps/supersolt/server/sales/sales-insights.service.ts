import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { assertUserHasVenueAccess, VenueAccessError } from "@/server/access/venue-access";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { listSquarePaymentsForVenue, type SquarePaymentListItem } from "@/server/square/list-payments";
import { batchRetrieveSquareOrders, type SquareOrderLineDto } from "@/server/square/batch-retrieve-orders";
import { squarePaymentsToSalesOrderRows } from "@/server/sales/square-to-sales-row";
import {
  buildCatalogObjectToMenuIdMap,
  buildMenuNameIndex,
  resolveSquareOrderLine,
} from "@/server/sales/square-line-resolve";
import { buildMockSalesOrders } from "@/entities/sales-insights/model/mock-sales-data";
import type {
  SalesInsightsMeta,
  SalesLineItemRow,
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

type Supabase = SupabaseClient<Database>;

export type SalesInsightsOrdersResult = {
  orders: SalesOrderRow[];
  meta: SalesInsightsMeta;
  salesMix: SalesMixRow[];
};

type AdminClient = SupabaseClient<Database>;

export async function loadSquareConnectionForVenue(
  userSupabase: Supabase,
  admin: AdminClient | null,
  venueId: string
): Promise<{
  square_access_token: string;
  environment: string;
  square_location_id: string | null;
} | null> {
  const sel =
    "square_access_token, environment, square_location_id" as const;
  const { data: asUser } = await userSupabase
    .from("venue_square_connections")
    .select(sel)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (asUser?.square_access_token) {
    return {
      square_access_token: asUser.square_access_token,
      environment: asUser.environment,
      square_location_id: asUser.square_location_id,
    };
  }

  if (!admin) {
    return null;
  }

  const { data: asAdmin } = await admin
    .from("venue_square_connections")
    .select(sel)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (!asAdmin?.square_access_token) {
    return null;
  }

  return {
    square_access_token: asAdmin.square_access_token,
    environment: asAdmin.environment,
    square_location_id: asAdmin.square_location_id,
  };
}

function buildLinesByPaymentId(
  payments: SquarePaymentListItem[],
  linesByOrderId: Map<string, SquareOrderLineDto[]>
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

function toSalesLineItemRow(
  line: SquareOrderLineDto,
  catalogByObjectId: Map<string, string>,
  byNormalizedName: Map<string, { id: string; name: string }>,
  idToName: Map<string, string>
): SalesLineItemRow {
  const r = resolveSquareOrderLine({
    line,
    catalogByObjectId,
    byNormalizedName,
    idToName,
  });
  return {
    lineUid: r.lineUid,
    quantity: r.quantity,
    lineName: r.lineName,
    grossAmountCents: r.grossAmountCents,
    currency: r.currency,
    squareCatalogObjectId: r.squareCatalogObjectId,
    squareVariationName: r.variationName,
    menuItemId: r.menuItemId,
    menuItemName: r.menuItemName,
    matchSource: r.matchSource,
  };
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

async function loadSquareLineMappingContext(
  userSupabase: Supabase,
  venueId: string
): Promise<{
  catalogByObjectId: Map<string, string>;
  byNormalizedName: Map<string, { id: string; name: string }>;
  idToName: Map<string, string>;
}> {
  const { data: links } = await userSupabase
    .from("menu_item_square_catalog_links")
    .select("square_catalog_object_id, menu_item_id")
    .eq("venue_id", venueId);

  const { data: menus } = await userSupabase
    .from("menu_items")
    .select("id, name")
    .eq("venue_id", venueId)
    .is("archived_at", null)
    .eq("is_active", true);

  const catalogByObjectId = buildCatalogObjectToMenuIdMap(links ?? []);
  const { byNormalizedName, idToName } = buildMenuNameIndex(menus ?? []);

  return { catalogByObjectId, byNormalizedName, idToName };
}

export async function getSalesInsightsOrders(
  userSupabase: Supabase,
  admin: AdminClient | null,
  args: {
    userId: string;
    organisationSlug: string;
    venueSlug: string;
    startIso: string;
    endIso: string;
  }
): Promise<SalesInsightsOrdersResult> {
  const context = await ingredientsRepo.getVenueContextBySlugs(
    userSupabase,
    args.organisationSlug,
    args.venueSlug
  );
  if (!context) {
    throw new VenueAccessError(404, "Venue not found");
  }

  await assertUserHasVenueAccess(userSupabase, {
    userId: args.userId,
    organisationId: context.organisationId,
    venueId: context.venueId,
  });

  const connection = await loadSquareConnectionForVenue(
    userSupabase,
    admin,
    context.venueId
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
      meta: { dataSource: "demo" },
      salesMix: computeSalesMix(orders),
    };
  }

  const listed = await listSquarePaymentsForVenue({
    accessToken: connection.square_access_token,
    storedEnvironment: connection.environment,
    beginTime: args.startIso,
    endTime: args.endIso,
    locationId: connection.square_location_id,
  });

  if (!listed.ok) {
    return {
      orders: [],
      meta: {
        dataSource: "square",
        squareError: listed.message,
      },
      salesMix: [],
    };
  }

  const mapped = squarePaymentsToSalesOrderRows(listed.payments).filter(
    (row) => row.order_datetime >= args.startIso && row.order_datetime <= args.endIso
  );

  const orderIds = [
    ...new Set(
      listed.payments
        .map((p) => p.order_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const ordersResult = await batchRetrieveSquareOrders({
    accessToken: connection.square_access_token,
    storedEnvironment: connection.environment,
    orderIds,
    locationId: connection.square_location_id,
  });

  const linesByOrderId = ordersResult.ok ? ordersResult.linesByOrderId : new Map();
  const meta: SalesInsightsMeta = { dataSource: "square" };
  if (!ordersResult.ok) {
    meta.squareOrdersError = ordersResult.message;
  }

  const linesByPaymentId = buildLinesByPaymentId(listed.payments, linesByOrderId);

  let catalogByObjectId = new Map<string, string>();
  let byNormalizedName = new Map<string, { id: string; name: string }>();
  let idToName = new Map<string, string>();
  try {
    const ctx = await loadSquareLineMappingContext(userSupabase, context.venueId);
    catalogByObjectId = ctx.catalogByObjectId;
    byNormalizedName = ctx.byNormalizedName;
    idToName = ctx.idToName;
  } catch (err) {
    console.error("[sales-insights] menu / catalog mapping load failed", err);
  }

  for (const row of mapped) {
    const spid = row.square?.squarePaymentId;
    if (!spid) continue;
    const rawLines = linesByPaymentId.get(spid);
    if (!rawLines?.length) continue;
    row.saleLineItems = rawLines.map((line) =>
      toSalesLineItemRow(line, catalogByObjectId, byNormalizedName, idToName)
    );
  }

  if (admin && linesByPaymentId.size > 0) {
    const upsertRows: Database["public"]["Tables"]["venue_square_order_lines"]["Insert"][] = [];
    const observedByPayment = new Map<string, string>();
    for (const p of listed.payments) {
      const id = p.id;
      if (!id) continue;
      observedByPayment.set(
        id,
        p.created_at ?? p.updated_at ?? new Date().toISOString()
      );
    }

    for (const p of listed.payments) {
      const pid = p.id;
      if (!pid) continue;
      const rawLines = linesByPaymentId.get(pid);
      if (!rawLines?.length) continue;
      const observedAt = observedByPayment.get(pid) ?? new Date().toISOString();
      for (const line of rawLines) {
        const resolved = toSalesLineItemRow(
          line,
          catalogByObjectId,
          byNormalizedName,
          idToName
        );
        upsertRows.push({
          venue_id: context.venueId,
          organisation_id: context.organisationId,
          square_payment_id: pid,
          square_order_id: p.order_id?.trim() ?? null,
          square_line_uid: line.lineUid,
          quantity: line.quantity,
          line_name: line.lineName,
          square_catalog_object_id: line.squareCatalogObjectId,
          gross_amount_cents: line.grossAmountCents,
          currency: line.currency,
          menu_item_id: resolved.menuItemId,
          match_source: resolved.matchSource,
          observed_at: observedAt,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (upsertRows.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < upsertRows.length; i += chunkSize) {
        const chunk = upsertRows.slice(i, i + chunkSize);
        const { error } = await admin.from("venue_square_order_lines").upsert(chunk, {
          onConflict: "venue_id,square_payment_id,square_line_uid",
        });
        if (error) {
          console.error("[sales-insights] venue_square_order_lines upsert", error);
          break;
        }
      }
    }
  }

  return {
    orders: mapped,
    meta,
    salesMix: computeSalesMix(mapped),
  };
}

export async function getVenueSquareConnectionSummary(
  userSupabase: Supabase,
  admin: AdminClient | null,
  args: {
    userId: string;
    organisationSlug: string;
    venueSlug: string;
  }
): Promise<{
  connected: boolean;
  merchantId: string | null;
  environment: string | null;
  updatedAt: string | null;
}> {
  const context = await ingredientsRepo.getVenueContextBySlugs(
    userSupabase,
    args.organisationSlug,
    args.venueSlug
  );
  if (!context) {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      updatedAt: null,
    };
  }

  try {
    await assertUserHasVenueAccess(userSupabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });
  } catch {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      updatedAt: null,
    };
  }

  const sel = "square_merchant_id, environment, updated_at" as const;

  const { data: asUser } = await userSupabase
    .from("venue_square_connections")
    .select(sel)
    .eq("venue_id", context.venueId)
    .maybeSingle();

  if (asUser?.square_merchant_id) {
    return {
      connected: true,
      merchantId: asUser.square_merchant_id,
      environment: asUser.environment,
      updatedAt: asUser.updated_at,
    };
  }

  if (!admin) {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      updatedAt: null,
    };
  }

  const { data: asAdmin } = await admin
    .from("venue_square_connections")
    .select(sel)
    .eq("venue_id", context.venueId)
    .maybeSingle();

  if (!asAdmin?.square_merchant_id) {
    return {
      connected: false,
      merchantId: null,
      environment: null,
      updatedAt: null,
    };
  }

  return {
    connected: true,
    merchantId: asAdmin.square_merchant_id,
    environment: asAdmin.environment,
    updatedAt: asAdmin.updated_at,
  };
}
