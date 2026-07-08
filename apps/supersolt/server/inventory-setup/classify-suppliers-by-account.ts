import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { suppliers } from "@/server/db/schema";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import { listXeroAccounts, type ResolvedAccount } from "@/server/xero/list-accounting-accounts";
import { listXeroAccpayInvoices } from "@/server/xero/list-accounting-invoices";

/** A supplier whose Xero bills point clearly at COGS or at overheads. */
export type SupplierInventorySuggestion = {
  supplierId: string;
  /** true → pre-tick (looks like an ingredient supplier); false → pre-untick. */
  suggestedInventory: boolean;
  /** Short human reason shown in the gate, e.g. "Bills coded to Direct Costs". */
  reason: string;
};

/** Xero account Type that means cost-of-goods-sold (ingredient spend). */
const COGS_ACCOUNT_TYPE = "DIRECTCOSTS";

/** How far back to scan bills for classification. Wide on purpose — the list
 *  sweep is cheap (no per-invoice GETs) and we want every supplier to classify,
 *  not just ones billed in the recent invoice window. */
const CLASSIFY_DAYS_BACK = 730;

/** Bills must be coded ≥ this fraction to Direct Costs to count as inventory. */
const COGS_DOMINANCE = 0.6;

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Contacts that are never an orderable ingredient supplier, by exact (normalised)
 * name. Exact-match only — so a real supplier whose name merely contains one of
 * these words ("Bank's Bakery") is never caught. Used to pre-exclude obvious
 * non-suppliers (the tax office, payment processors) that the keep-when-unsure
 * default would otherwise leave pre-ticked.
 *
 * NOTE: "No Contact" is deliberately NOT here — those are real bills the client
 * forgot to assign a contact to; they get folded into their true supplier by
 * account code rather than excluded (see fold-orphan-bills).
 */
const NON_INVENTORY_SUPPLIER_NAMES = new Set<string>([
  "ato",
  "australian taxation office",
  "bank fees",
  "paypal",
  "stripe",
  "square",
]);

/** True if this contact name should never be treated as an ingredient supplier. */
export function isLikelyNonInventorySupplierName(name: string): boolean {
  return NON_INVENTORY_SUPPLIER_NAMES.has(norm(name));
}

function dateSinceFilter(daysBack: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

type SupplierRow = { id: string; xeroContactId: string | null; name: string };

async function loadSupplierMaps(ctx: RequestAuthContext, organisationId: string) {
  const rows: SupplierRow[] = await ctx.appDb.admin
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

type Tally = {
  coded: number;
  cogs: number;
  /** Non-COGS account name → line count, for the "overheads (…)" reason. */
  overheadCounts: Map<string, number>;
  /** A COGS account name, for the inventory reason. */
  cogsName: string | null;
};

function topOverheadName(tally: Tally): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of tally.overheadCounts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function classifyTally(tally: Tally): { suggestedInventory: boolean; reason: string } {
  if (tally.coded === 0) {
    return { suggestedInventory: true, reason: "No coded bills — please confirm" };
  }
  const cogsFraction = tally.cogs / tally.coded;
  if (cogsFraction >= COGS_DOMINANCE) {
    return {
      suggestedInventory: true,
      reason: tally.cogsName
        ? `Bills coded to Direct Costs (${tally.cogsName})`
        : "Bills coded to Direct Costs",
    };
  }
  if (tally.cogs === 0) {
    const overhead = topOverheadName(tally);
    return {
      suggestedInventory: false,
      reason: overhead ? `Bills coded to overheads (${overhead})` : "Bills coded to overheads",
    };
  }
  // Some COGS but not dominant — keep it on, but flag for a look.
  return { suggestedInventory: true, reason: "Mixed coding — please confirm" };
}

/**
 * Classify each supplier as an inventory source or not, from how its Xero bills
 * are coded in the chart of accounts. Direct-Costs accounts (COGS) → ingredient
 * supplier; overhead/expense accounts → not. The signal comes inline on the
 * Invoices list endpoint, so this is one bill sweep + one /Accounts call — no
 * per-invoice GETs, no PDF parsing. Non-fatal: on any Xero failure it returns an
 * empty map and the caller falls back to the manual (all-on) gate.
 */
export async function classifySuppliersByAccount(
  ctx: RequestAuthContext,
  args: { organisationId: string; venueId: string },
): Promise<{ suggestions: Map<string, SupplierInventorySuggestion>; error: string | null }> {
  const empty = new Map<string, SupplierInventorySuggestion>();

  const connection = await loadVenueXeroConnectionForVenue(ctx.appDb, args.venueId);
  if (!connection) return { suggestions: empty, error: "No Xero connection for this venue" };
  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) return { suggestions: empty, error: token.message };

  const accounts = await listXeroAccounts({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
  });
  if (!accounts.ok) return { suggestions: empty, error: accounts.message };

  const invoices = await listXeroAccpayInvoices({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    dateSince: dateSinceFilter(CLASSIFY_DAYS_BACK),
  });
  if (!invoices.ok) return { suggestions: empty, error: invoices.message };

  const { byContact, byName } = await loadSupplierMaps(ctx, args.organisationId);

  // Aggregate account-code usage per supplier across all their bills.
  const tallies = new Map<string, Tally>();
  const resolveAccount = (code: string | undefined): ResolvedAccount | null =>
    code ? (accounts.byCode.get(code.trim()) ?? null) : null;

  for (const inv of invoices.invoices) {
    if ((inv.Status ?? "").toUpperCase() === "DELETED") continue;
    const contactId = inv.Contact?.ContactID?.trim();
    const contactName = inv.Contact?.Name?.trim();
    const supplierId =
      (contactId ? byContact.get(contactId) : undefined) ??
      (contactName ? byName.get(norm(contactName)) : undefined) ??
      null;
    if (!supplierId) continue;

    let tally = tallies.get(supplierId);
    if (!tally) {
      tally = { coded: 0, cogs: 0, overheadCounts: new Map(), cogsName: null };
      tallies.set(supplierId, tally);
    }

    for (const line of inv.LineItems ?? []) {
      const account = resolveAccount(line.AccountCode);
      if (!account) continue;
      tally.coded += 1;
      if (account.type === COGS_ACCOUNT_TYPE) {
        tally.cogs += 1;
        if (!tally.cogsName) tally.cogsName = account.name;
      } else {
        tally.overheadCounts.set(
          account.name,
          (tally.overheadCounts.get(account.name) ?? 0) + 1,
        );
      }
    }
  }

  const suggestions = new Map<string, SupplierInventorySuggestion>();
  for (const [supplierId, tally] of tallies) {
    if (tally.coded === 0) continue; // no signal → leave to the caller's default
    const { suggestedInventory, reason } = classifyTally(tally);
    suggestions.set(supplierId, { supplierId, suggestedInventory, reason });
  }

  console.info("[inventory-setup] supplier_account_classification", {
    venueId: args.venueId,
    billsScanned: invoices.invoices.length,
    suppliersClassified: suggestions.size,
    excluded: [...suggestions.values()].filter((s) => !s.suggestedInventory).length,
  });

  return { suggestions, error: null };
}
