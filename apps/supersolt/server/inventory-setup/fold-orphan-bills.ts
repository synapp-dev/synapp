import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { suppliers, venueInvoices } from "@/server/db/schema";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import { listXeroAccounts } from "@/server/xero/list-accounting-accounts";
import { listXeroAccpayInvoices } from "@/server/xero/list-accounting-invoices";
import { classifyPlaceholders } from "@/server/inventory-setup/orphan-attribution";

/**
 * Supplier names that are never a real, orderable supplier — just a placeholder
 * the client left on bills they forgot to assign a contact to. Exact (normalised)
 * match only. These get FOLDED into their true supplier by account code rather
 * than excluded, so their bills/items aren't lost.
 */
const PLACEHOLDER_SUPPLIER_NAMES = new Set<string>(["no contact"]);

const FOLD_DAYS_BACK = 730;
const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** True if this is a placeholder contact (not a real supplier the user should
 *  triage). These are hidden from the selection gate and folded automatically. */
export function isPlaceholderSupplierName(name: string): boolean {
  return PLACEHOLDER_SUPPLIER_NAMES.has(norm(name));
}

function dateSinceFilter(daysBack: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export type OrphanFold = {
  fromSupplierId: string;
  fromName: string;
  toSupplierId: string;
  toName: string;
  viaAccount: string;
};

/**
 * Fold "No Contact"-style placeholder suppliers into their true supplier using
 * the per-supplier purchase account on their bills. When this client codes a bill
 * to "Purchases - JT's Fruit & Veg", that account is owned by exactly one real
 * supplier (JR Group), so a contact-less bill on that account clearly belongs to
 * JR Group. We only fold a placeholder when ALL its bills point at a SINGLE real
 * supplier — anything ambiguous is left alone.
 *
 * Runs after invoice sync and before PDF parsing, so the reattributed bills get
 * read under the right supplier. Non-fatal: returns an error string on any Xero
 * failure and changes nothing. Reads account codes live (we don't persist them).
 */
export async function foldOrphanBillsByAccount(
  ctx: RequestAuthContext,
  args: { organisationId: string; venueId: string },
): Promise<{ folds: OrphanFold[]; reassignedInvoices: number; error: string | null }> {
  const connection = await loadVenueXeroConnectionForVenue(ctx.appDb, args.venueId);
  if (!connection) return { folds: [], reassignedInvoices: 0, error: "No Xero connection" };
  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) return { folds: [], reassignedInvoices: 0, error: token.message };

  const accounts = await listXeroAccounts({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
  });
  const accountName = (code: string) =>
    (accounts.ok ? accounts.byCode.get(code)?.name : undefined) ?? code;

  const invoices = await listXeroAccpayInvoices({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    dateSince: dateSinceFilter(FOLD_DAYS_BACK),
  });
  if (!invoices.ok) return { folds: [], reassignedInvoices: 0, error: invoices.message };

  // DB suppliers, by contact id and by name, plus id → name for placeholder checks.
  const supplierRows = await ctx.appDb.rls((tx) =>
    tx
      .select({
        id: suppliers.id,
        name: suppliers.name,
        xeroContactId: suppliers.xeroContactId,
      })
      .from(suppliers)
      .where(and(eq(suppliers.organisationId, args.organisationId), isNull(suppliers.archivedAt))),
  );
  const byContact = new Map<string, string>();
  const byName = new Map<string, string>();
  const nameById = new Map<string, string>();
  for (const row of supplierRows) {
    if (row.xeroContactId) byContact.set(row.xeroContactId, row.id);
    byName.set(norm(row.name), row.id);
    nameById.set(row.id, row.name);
  }

  // Which suppliers own each account, and which accounts each supplier uses.
  const accountOwners = new Map<string, Set<string>>();
  const ownerAccounts = new Map<string, Set<string>>();
  for (const inv of invoices.invoices) {
    if ((inv.Status ?? "").toUpperCase() === "DELETED") continue;
    const contactId = inv.Contact?.ContactID?.trim();
    const contactName = inv.Contact?.Name?.trim();
    const supplierId =
      (contactId ? byContact.get(contactId) : undefined) ??
      (contactName ? byName.get(norm(contactName)) : undefined) ??
      null;
    if (!supplierId) continue;

    for (const line of inv.LineItems ?? []) {
      const code = line.AccountCode?.trim();
      if (!code) continue;
      let owners = accountOwners.get(code);
      if (!owners) accountOwners.set(code, (owners = new Set()));
      owners.add(supplierId);
      let accts = ownerAccounts.get(supplierId);
      if (!accts) ownerAccounts.set(supplierId, (accts = new Set()));
      accts.add(code);
    }
  }

  const isPlaceholder = (supplierId: string) =>
    PLACEHOLDER_SUPPLIER_NAMES.has(norm(nameById.get(supplierId) ?? ""));

  const placeholderIds = [...nameById.keys()].filter(isPlaceholder);

  // Shared classification: foldable (one clear owner) vs un-foldable (ambiguous).
  // The un-foldable remainder surfaces in the manual attribution queue.
  const classification = classifyPlaceholders({
    placeholderIds,
    ownerAccounts,
    accountOwners,
    isPlaceholder,
  });

  // Pick a representative account the placeholder shares with its fold target,
  // for the human-readable log/return.
  const viaAccountFor = (placeholderId: string, toSupplierId: string): string => {
    for (const code of ownerAccounts.get(placeholderId) ?? []) {
      if (accountOwners.get(code)?.has(toSupplierId)) return accountName(code);
    }
    return "";
  };

  const folds: OrphanFold[] = classification.foldable.map((f) => ({
    fromSupplierId: f.placeholderId,
    fromName: nameById.get(f.placeholderId) ?? "",
    toSupplierId: f.toSupplierId,
    toName: nameById.get(f.toSupplierId) ?? "",
    viaAccount: viaAccountFor(f.placeholderId, f.toSupplierId),
  }));

  if (folds.length === 0) return { folds: [], reassignedInvoices: 0, error: null };

  const now = new Date().toISOString();
  let reassignedInvoices = 0;
  await ctx.appDb.rls(async (tx) => {
    for (const fold of folds) {
      const moved = await tx
        .update(venueInvoices)
        .set({ supplierId: fold.toSupplierId, supplierName: fold.toName, updatedAt: now })
        .where(
          and(
            eq(venueInvoices.organisationId, args.organisationId),
            eq(venueInvoices.venueId, args.venueId),
            eq(venueInvoices.supplierId, fold.fromSupplierId),
          ),
        )
        .returning({ id: venueInvoices.id });
      reassignedInvoices += moved.length;

      await tx
        .update(suppliers)
        .set({ archivedAt: now, updatedAt: now })
        .where(
          and(eq(suppliers.id, fold.fromSupplierId), eq(suppliers.organisationId, args.organisationId)),
        );
    }
  });

  console.info("[inventory-setup] orphan_bills_folded", {
    venueId: args.venueId,
    reassignedInvoices,
    folds: folds.map((f) => `${f.fromName}→${f.toName} (${f.viaAccount})`),
  });

  return { folds, reassignedInvoices, error: null };
}
