import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { suppliers } from "@/server/db/schema";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import {
  listXeroPurchaseOrders,
  type XeroApiPurchaseOrder,
} from "@/server/xero/list-accounting-purchase-orders";
import type { InvoiceLineForAggregation } from "@/server/supplier-raw-items/supplier-raw-items.repo";

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** Cents from a Xero dollar amount; null for missing/zero so it never clobbers a
 *  real invoice price when the two are merged. */
function dollarsToCents(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

async function loadPurchaseOrders(
  ctx: RequestAuthContext,
  venueId: string,
): Promise<
  | { ok: true; pos: XeroApiPurchaseOrder[] }
  | { ok: false; error: string }
> {
  const connection = await loadVenueXeroConnectionForVenue(ctx.appDb, venueId);
  if (!connection) return { ok: false, error: "No Xero connection for this venue" };
  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) return { ok: false, error: token.message };
  const fetched = await listXeroPurchaseOrders({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
  });
  if (!fetched.ok) return { ok: false, error: fetched.message };
  return { ok: true, pos: fetched.purchaseOrders };
}

async function loadSupplierMaps(ctx: RequestAuthContext, organisationId: string) {
  const rows = await ctx.appDb.admin
    .select({
      id: suppliers.id,
      xeroContactId: suppliers.xeroContactId,
      name: suppliers.name,
    })
    .from(suppliers)
    .where(and(eq(suppliers.organisationId, organisationId), isNull(suppliers.archivedAt)));
  const byContact = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const row of rows) {
    if (row.xeroContactId) byContact.set(row.xeroContactId, row.id);
    byName.set(norm(row.name), row.id);
  }
  return { byContact, byName };
}

/**
 * Create suppliers for any PO contact that isn't already a supplier. Xero's contact
 * sync only pulls contacts that have *bills*, so suppliers we only raise POs to
 * (e.g. Morabito Fruit & Veg) never get created — this fills that gap so they show
 * up in the inventory-setup selection gate alongside everyone else.
 */
export async function ensureSuppliersFromPurchaseOrders(
  ctx: RequestAuthContext,
  args: { organisationId: string; venueId: string },
): Promise<{ created: number; error: string | null }> {
  const loaded = await loadPurchaseOrders(ctx, args.venueId);
  if (!loaded.ok) return { created: 0, error: loaded.error };

  const { byContact, byName } = await loadSupplierMaps(ctx, args.organisationId);
  const toCreate = new Map<string, { name: string; contactId: string | null }>();

  for (const po of loaded.pos) {
    if (po.Status === "DELETED") continue;
    const contactId = po.Contact?.ContactID?.trim();
    const contactName = po.Contact?.Name?.trim();
    if (!contactName) continue;
    if (contactId && byContact.has(contactId)) continue;
    if (byName.has(norm(contactName))) continue;
    const key = contactId ?? norm(contactName);
    if (!toCreate.has(key)) toCreate.set(key, { name: contactName, contactId: contactId ?? null });
  }

  if (toCreate.size === 0) return { created: 0, error: null };

  await ctx.appDb.admin.insert(suppliers).values(
    [...toCreate.values()].map((c) => ({
      organisationId: args.organisationId,
      venueId: args.venueId,
      name: c.name,
      xeroContactId: c.contactId,
      isInventorySource: true,
    })),
  );
  console.info("[inventory-setup] po_suppliers_created", {
    venueId: args.venueId,
    created: toCreate.size,
  });
  return { created: toCreate.size, error: null };
}

/**
 * Build raw-catalog lines from Purchase Order line items for the given suppliers.
 * Deduped per (supplier + item code, else description), keeping the most recent
 * non-zero price. These feed the SAME aggregation as invoice lines so POs add
 * coverage for items/suppliers that have no parseable bill.
 */
export async function buildPurchaseOrderRawLines(
  ctx: RequestAuthContext,
  args: { organisationId: string; venueId: string; supplierIds?: string[] },
): Promise<{ lines: InvoiceLineForAggregation[]; error: string | null }> {
  const loaded = await loadPurchaseOrders(ctx, args.venueId);
  if (!loaded.ok) return { lines: [], error: loaded.error };

  const { byContact, byName } = await loadSupplierMaps(ctx, args.organisationId);
  const allow = args.supplierIds ? new Set(args.supplierIds) : null;

  type Accum = {
    supplierId: string;
    description: string;
    quantity: number | null;
    priceCents: number | null;
  };
  const accum = new Map<string, Accum>();

  for (const po of loaded.pos) {
    if (po.Status === "DELETED") continue;
    const contactId = po.Contact?.ContactID?.trim();
    const contactName = po.Contact?.Name?.trim();
    const supplierId =
      (contactId ? byContact.get(contactId) : undefined) ??
      (contactName ? byName.get(norm(contactName)) : undefined) ??
      null;
    if (!supplierId) continue;
    if (allow && !allow.has(supplierId)) continue;

    for (const li of po.LineItems ?? []) {
      const description = (li.Description ?? "").trim() || (li.ItemCode ?? "").trim();
      if (!description) continue;
      const code = li.ItemCode?.trim().toLowerCase();
      const key = `${supplierId}::${code ? `sku:${code}` : `name:${norm(description)}`}`;
      const priceCents = dollarsToCents(li.UnitAmount);
      const cur = accum.get(key);
      if (!cur) {
        accum.set(key, { supplierId, description, quantity: li.Quantity ?? null, priceCents });
      } else if (cur.priceCents == null && priceCents != null) {
        cur.priceCents = priceCents;
      }
    }
  }

  const lines: InvoiceLineForAggregation[] = [...accum.values()].map((a) => ({
    supplierId: a.supplierId,
    invoiceId: null,
    parsedDescription: a.description,
    unit: null,
    quantity: a.quantity,
    unitPriceCents: a.priceCents,
    lineTotalCents: null,
    isLikelyInventory: true,
    source: "xero_api",
  }));
  return { lines, error: null };
}
