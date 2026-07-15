import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";
const BATCH_MAX = 100;

/** Normalized modifier on a Square order line (e.g. "Extra cheese"). */
export type SquareOrderLineModifierDto = {
  name: string;
  quantity: number;
  amountCents: number;
  catalogObjectId: string | null;
};

/** Normalized Square order line for mapping and persistence. */
export type SquareOrderLineDto = {
  squareOrderId: string;
  lineUid: string;
  quantity: number;
  lineName: string;
  squareCatalogObjectId: string | null;
  variationName: string | null;
  grossAmountCents: number;
  currency: string;
  modifiers: SquareOrderLineModifierDto[];
};

type SquareMoney = { amount?: number; currency?: string };

type SquareOrderLineModifierRaw = {
  uid?: string;
  name?: string;
  quantity?: string;
  catalog_object_id?: string;
  base_price_money?: SquareMoney;
  total_price_money?: SquareMoney;
};

type SquareOrderLineRaw = {
  uid?: string;
  quantity?: string;
  name?: string;
  catalog_object_id?: string;
  variation_name?: string;
  gross_sales_money?: SquareMoney;
  total_money?: SquareMoney;
  modifiers?: SquareOrderLineModifierRaw[];
};

type SquareOrderRaw = {
  id?: string;
  line_items?: SquareOrderLineRaw[];
};

type BatchRetrieveOrdersResponse = {
  orders?: SquareOrderRaw[];
  errors?: Array<{ detail?: string; code?: string }>;
};

function apiBaseForStoredEnv(environment: string): string {
  const env = (environment === "production" ? "production" : "sandbox") as SquareEnvironment;
  return getSquareBaseUrl(env);
}

function moneyAmountCents(m: SquareMoney | null | undefined): number {
  const n = m?.amount;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function moneyCurrency(m: SquareMoney | null | undefined, fallback: string): string {
  const c = m?.currency?.toUpperCase();
  return c && c.length === 3 ? c : fallback;
}

function parseQuantity(q: string | undefined): number {
  if (!q) return 0;
  const n = Number(q);
  return Number.isFinite(n) ? n : 0;
}

function normalizeModifiers(
  raw: SquareOrderLineModifierRaw[] | undefined,
): SquareOrderLineModifierDto[] {
  const out: SquareOrderLineModifierDto[] = [];
  for (const mod of raw ?? []) {
    const name = mod.name?.trim();
    if (!name) continue;
    out.push({
      name,
      quantity: parseQuantity(mod.quantity) || 1,
      amountCents:
        moneyAmountCents(mod.total_price_money) ||
        moneyAmountCents(mod.base_price_money),
      catalogObjectId: mod.catalog_object_id?.trim() || null,
    });
  }
  return out;
}

function normalizeOrder(order: SquareOrderRaw): SquareOrderLineDto[] {
  const orderId = order.id;
  if (!orderId) return [];

  const lines = order.line_items ?? [];
  const out: SquareOrderLineDto[] = [];

  for (const li of lines) {
    const uid = li.uid;
    if (!uid) continue;

    const gross = moneyAmountCents(li.gross_sales_money) || moneyAmountCents(li.total_money);
    const currency = moneyCurrency(li.gross_sales_money ?? li.total_money, "AUD");

    out.push({
      squareOrderId: orderId,
      lineUid: uid,
      quantity: parseQuantity(li.quantity),
      lineName: (li.name ?? "").trim() || "Item",
      squareCatalogObjectId: li.catalog_object_id?.trim() || null,
      variationName: li.variation_name?.trim() || null,
      grossAmountCents: gross,
      currency,
      modifiers: normalizeModifiers(li.modifiers),
    });
  }

  return out;
}

/**
 * Batch-retrieve Square orders by id (up to 100 per request). Requires ORDERS_READ.
 */
export async function batchRetrieveSquareOrders(args: {
  accessToken: string;
  storedEnvironment: string;
  orderIds: string[];
  locationId?: string | null;
}): Promise<
  | { ok: true; linesByOrderId: Map<string, SquareOrderLineDto[]> }
  | { ok: false; message: string; status: number }
> {
  const ids = [...new Set(args.orderIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: true, linesByOrderId: new Map() };
  }

  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const linesByOrderId = new Map<string, SquareOrderLineDto[]>();

  for (let i = 0; i < ids.length; i += BATCH_MAX) {
    const chunk = ids.slice(i, i + BATCH_MAX);
    const body: { order_ids: string[]; location_id?: string } = { order_ids: chunk };
    if (args.locationId) {
      body.location_id = args.locationId;
    }

    const res = await fetch(`${base}/v2/orders/batch-retrieve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as BatchRetrieveOrdersResponse & { message?: string };

    if (!res.ok) {
      const detail =
        json.message ??
        json.errors?.map((e) => e.detail).filter(Boolean).join("; ") ??
        `Square batch-retrieve orders failed (${res.status})`;
      return { ok: false, message: detail, status: res.status };
    }

    for (const order of json.orders ?? []) {
      const oid = order.id;
      if (!oid) continue;
      const normalized = normalizeOrder(order);
      linesByOrderId.set(oid, normalized);
    }
  }

  return { ok: true, linesByOrderId };
}
