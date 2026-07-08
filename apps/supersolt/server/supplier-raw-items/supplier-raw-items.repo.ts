import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  supplierRawItems,
  suppliers,
  venueInvoiceLineItems,
  venueInvoices,
} from "@/server/db/schema";
import {
  normalizeRawDescription,
  normalizeRawUnit,
} from "@/server/supplier-raw-items/normalize-raw-description";

export type SupplierRawItemRow = typeof supplierRawItems.$inferSelect;
export type SupplierRawItemInsert = typeof supplierRawItems.$inferInsert;
export type RawItemSource = "xero_api" | "invoice_parse" | "manual";

export type InvoiceLineForAggregation = {
  supplierId: string;
  /** null for non-invoice sources (e.g. purchase-order lines). */
  invoiceId: string | null;
  parsedDescription: string | null;
  unit: string | null;
  quantity: string | number | null;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  isLikelyInventory: boolean | null;
  source: RawItemSource;
};

/**
 * A reviewed raw item already linked to a supplier_product, carrying the price
 * and date of its most recent invoice — the input to re-import price
 * propagation (refresh an already-approved product's price from a newer bill).
 */
export type LinkedPricePropagationCandidate = {
  supplierProductId: string;
  newPriceCents: number;
  invoiceId: string;
  /** Invoice date of the raw item's latest invoice (null if undated). */
  invoiceDate: string | null;
};

export const supplierRawItemsRepo = {
  async listForSupplier(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      search?: string;
      includeArchived?: boolean;
    },
  ): Promise<SupplierRawItemRow[]> {
    const conditions: SQL[] = [
      eq(supplierRawItems.organisationId, args.organisationId),
      eq(supplierRawItems.supplierId, args.supplierId),
    ];

    if (!args.includeArchived) {
      conditions.push(isNull(supplierRawItems.archivedAt));
    }

    if (args.search?.trim()) {
      const pattern = `%${args.search.trim().replace(/[%_]/g, "")}%`;
      conditions.push(
        or(
          ilike(supplierRawItems.rawDescription, pattern),
          ilike(supplierRawItems.rawUnit, pattern),
        )!,
      );
    }

    return tx
      .select()
      .from(supplierRawItems)
      .where(and(...conditions))
      .orderBy(desc(supplierRawItems.lastSeenAt));
  },

  async findById(
    tx: RlsTx,
    args: { organisationId: string; supplierId: string; rawItemId: string },
  ): Promise<SupplierRawItemRow | null> {
    const rows = await tx
      .select()
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.id, args.rawItemId),
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async findByDedupeKey(
    tx: RlsTx,
    args: {
      supplierId: string;
      rawDescriptionNormalized: string;
      rawUnitNormalized: string;
    },
  ): Promise<SupplierRawItemRow | null> {
    const rows = await tx
      .select()
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.supplierId, args.supplierId),
          eq(supplierRawItems.rawDescriptionNormalized, args.rawDescriptionNormalized),
          eq(supplierRawItems.rawUnitNormalized, args.rawUnitNormalized),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async create(
    tx: RlsTx,
    row: SupplierRawItemInsert,
  ): Promise<SupplierRawItemRow> {
    const rows = await tx.insert(supplierRawItems).values(row).returning();
    return rows[0]!;
  },

  async update(
    tx: RlsTx,
    args: {
      rawItemId: string;
      patch: Partial<SupplierRawItemInsert>;
    },
  ): Promise<SupplierRawItemRow | null> {
    const rows = await tx
      .update(supplierRawItems)
      .set({ ...args.patch, updatedAt: new Date().toISOString() })
      .where(eq(supplierRawItems.id, args.rawItemId))
      .returning();
    return rows[0] ?? null;
  },

  async setReviewed(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      rawItemIds: string[];
      reviewedAt: string | null;
      reviewedBy: string | null;
    },
  ): Promise<number> {
    if (args.rawItemIds.length === 0) return 0;
    const rows = await tx
      .update(supplierRawItems)
      .set({
        reviewedAt: args.reviewedAt,
        reviewedBy: args.reviewedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  /**
   * Mark a set of raw items as not stockable inventory and reviewed — the
   * wizard's "Not inventory" skip. Clears them from the unreviewed backlog
   * without creating a catalog product.
   */
  async setNotInventory(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      rawItemIds: string[];
      reviewedAt: string;
      reviewedBy: string | null;
    },
  ): Promise<number> {
    if (args.rawItemIds.length === 0) return 0;
    const rows = await tx
      .update(supplierRawItems)
      .set({
        isLikelyInventory: false,
        reviewedAt: args.reviewedAt,
        reviewedBy: args.reviewedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  /**
   * The items-triage rescue: flip wrongly-flagged rows back to inventory and
   * stamp them reviewed. The inverse of setNotInventory — mints nothing; the
   * rescued rows flow into the normalisation queue like any other inventory
   * item, where the real mapping happens.
   */
  async restoreToInventory(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      rawItemIds: string[];
      reviewedAt: string;
      reviewedBy: string | null;
    },
  ): Promise<number> {
    if (args.rawItemIds.length === 0) return 0;
    const rows = await tx
      .update(supplierRawItems)
      .set({
        isLikelyInventory: true,
        reviewedAt: args.reviewedAt,
        reviewedBy: args.reviewedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  /**
   * Stamp every still-unreviewed raw item of a supplier as reviewed — the
   * one-shot close of the items-triage step. Inventory flags are left exactly
   * as they stand (rescues happen via restoreToInventory first); mapping into
   * ingredients stays the normalisation stage's job.
   */
  async setAllReviewedForSupplier(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      reviewedAt: string;
      reviewedBy: string | null;
    },
  ): Promise<number> {
    const rows = await tx
      .update(supplierRawItems)
      .set({
        reviewedAt: args.reviewedAt,
        reviewedBy: args.reviewedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          isNull(supplierRawItems.reviewedAt),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  /**
   * Approve a pack's raw items from the supplier wizard: link them to the
   * supplier_product just created and stamp reviewed — but deliberately leave
   * `normalisationStatus` as-is (pending). Turning raw items into ingredients is
   * the separate normalisation step, which must still pick them up.
   */
  async linkSupplierProductForReview(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      rawItemIds: string[];
      supplierProductId: string;
      reviewedAt: string;
      reviewedBy: string | null;
    },
  ): Promise<number> {
    if (args.rawItemIds.length === 0) return 0;
    const rows = await tx
      .update(supplierRawItems)
      .set({
        supplierProductId: args.supplierProductId,
        reviewedAt: args.reviewedAt,
        reviewedBy: args.reviewedBy,
        updatedBy: args.reviewedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  /**
   * Mark a set of raw items normalised against an existing supplier product —
   * used to fold a product's quantity variants into the one normalisation the
   * user just committed. Scoped to org + supplier so a stray id can't match.
   */
  async markNormalisedForProduct(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      rawItemIds: string[];
      supplierProductId: string;
      userId: string;
    },
  ): Promise<number> {
    if (args.rawItemIds.length === 0) return 0;
    const rows = await tx
      .update(supplierRawItems)
      .set({
        normalisationStatus: "normalised",
        supplierProductId: args.supplierProductId,
        // Normalising IS the review decision — stamp it if the supplier stage
        // hasn't already, so these rows qualify for re-import price propagation.
        reviewedAt: sql`coalesce(${supplierRawItems.reviewedAt}, now())`,
        reviewedBy: sql`coalesce(${supplierRawItems.reviewedBy}, ${args.userId})`,
        updatedBy: args.userId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      )
      .returning({ id: supplierRawItems.id });
    return rows.length;
  },

  async archive(tx: RlsTx, rawItemId: string): Promise<boolean> {
    const rows = await tx
      .update(supplierRawItems)
      .set({
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(supplierRawItems.id, rawItemId))
      .returning({ id: supplierRawItems.id });
    return rows.length > 0;
  },

  /** The cached LLM normalisation suggestion stored on this raw item, if any. */
  async getStoredSuggestion(
    tx: RlsTx,
    args: { organisationId: string; rawItemId: string },
  ): Promise<unknown | null> {
    const rows = await tx
      .select({ suggestion: supplierRawItems.normalisationSuggestion })
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.id, args.rawItemId),
          eq(supplierRawItems.organisationId, args.organisationId),
        ),
      )
      .limit(1);
    return rows[0]?.suggestion ?? null;
  },

  /** Persist an LLM suggestion so it survives reloads (no re-fetch). */
  async setStoredSuggestion(
    tx: RlsTx,
    args: { organisationId: string; rawItemId: string; suggestion: unknown },
  ): Promise<void> {
    await tx
      .update(supplierRawItems)
      .set({ normalisationSuggestion: args.suggestion })
      .where(
        and(
          eq(supplierRawItems.id, args.rawItemId),
          eq(supplierRawItems.organisationId, args.organisationId),
        ),
      );
  },

  venueScopeCondition(organisationId: string, venueId: string): SQL {
    return and(
      eq(supplierRawItems.organisationId, organisationId),
      isNull(supplierRawItems.archivedAt),
      isNull(suppliers.archivedAt),
      or(isNull(suppliers.venueId), eq(suppliers.venueId, venueId))!,
    )!;
  },

  async countForOrganisationVenue(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(supplierRawItems)
      .innerJoin(suppliers, eq(supplierRawItems.supplierId, suppliers.id))
      .where(supplierRawItemsRepo.venueScopeCondition(args.organisationId, args.venueId));
    return rows[0]?.count ?? 0;
  },

  /** Venue-wide count of raw items still awaiting an approve/skip decision. */
  async countUnreviewedForOrganisationVenue(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(supplierRawItems)
      .innerJoin(suppliers, eq(supplierRawItems.supplierId, suppliers.id))
      .where(
        and(
          supplierRawItemsRepo.venueScopeCondition(
            args.organisationId,
            args.venueId,
          ),
          isNull(supplierRawItems.reviewedAt),
        ),
      );
    return rows[0]?.count ?? 0;
  },

  /**
   * Every non-archived raw item's description + inventory flag, per supplier —
   * feeds the suppliers table's "unique products (total parsed)" breakdown.
   * The variant-fold into unique products happens in TS (countUniqueProducts);
   * that relation is fuzzy, not expressible as a SQL GROUP BY.
   */
  async listCatalogBreakdownRows(
    tx: RlsTx,
    args: { organisationId: string; supplierIds: string[] },
  ): Promise<
    Array<{
      supplierId: string;
      rawDescription: string;
      isLikelyInventory: boolean | null;
      lastUnitPriceCents: number | null;
    }>
  > {
    if (args.supplierIds.length === 0) return [];
    return tx
      .select({
        supplierId: supplierRawItems.supplierId,
        rawDescription: supplierRawItems.rawDescription,
        isLikelyInventory: supplierRawItems.isLikelyInventory,
        lastUnitPriceCents: supplierRawItems.lastUnitPriceCents,
      })
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          inArray(supplierRawItems.supplierId, args.supplierIds),
          isNull(supplierRawItems.archivedAt),
        ),
      );
  },

  /**
   * Per-supplier count of likely-inventory raw items regardless of review
   * state (`isLikelyInventory !== false`, non-archived) — the coverage signal
   * for "this supplier actually yields stock". Reviewing no longer creates
   * products, so gates key off inventory presence, not a priced catalog.
   */
  async countLikelyInventoryBySupplierIds(
    tx: RlsTx,
    args: { organisationId: string; supplierIds: string[] },
  ): Promise<Map<string, number>> {
    if (args.supplierIds.length === 0) return new Map();

    const rows = await tx
      .select({
        supplierId: supplierRawItems.supplierId,
        count: sql<number>`count(*)::int`,
      })
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          inArray(supplierRawItems.supplierId, args.supplierIds),
          isNull(supplierRawItems.archivedAt),
          or(
            isNull(supplierRawItems.isLikelyInventory),
            eq(supplierRawItems.isLikelyInventory, true),
          ),
        ),
      )
      .groupBy(supplierRawItems.supplierId);

    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(row.supplierId, row.count);
    }
    return result;
  },

  /**
   * Per-supplier count of approved, likely-inventory raw items — the "Items"
   * the supplier drawer shows as approved under "Likely inventory". Likely
   * inventory mirrors the drawer rule (`isLikelyInventory !== false`, i.e. true
   * or null); approved means the row has been reviewed. Archived rows are
   * excluded. Suppliers with none are simply absent from the returned map.
   */
  async countApprovedInventoryBySupplierIds(
    tx: RlsTx,
    args: { organisationId: string; supplierIds: string[] },
  ): Promise<Map<string, number>> {
    if (args.supplierIds.length === 0) return new Map();

    const rows = await tx
      .select({
        supplierId: supplierRawItems.supplierId,
        count: sql<number>`count(*)::int`,
      })
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          inArray(supplierRawItems.supplierId, args.supplierIds),
          isNull(supplierRawItems.archivedAt),
          isNotNull(supplierRawItems.reviewedAt),
          or(
            isNull(supplierRawItems.isLikelyInventory),
            eq(supplierRawItems.isLikelyInventory, true),
          ),
        ),
      )
      .groupBy(supplierRawItems.supplierId);

    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(row.supplierId, row.count);
    }
    return result;
  },

  /**
   * Per-supplier count of raw items still awaiting an approve/skip decision
   * (`reviewedAt` null), across both likely-inventory and non-inventory.
   * Archived rows are excluded. Drives the "Items" section of supplier
   * readiness. Suppliers with none are absent from the returned map.
   */
  async countUnreviewedBySupplierIds(
    tx: RlsTx,
    args: { organisationId: string; supplierIds: string[] },
  ): Promise<Map<string, number>> {
    if (args.supplierIds.length === 0) return new Map();

    const rows = await tx
      .select({
        supplierId: supplierRawItems.supplierId,
        count: sql<number>`count(*)::int`,
      })
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          inArray(supplierRawItems.supplierId, args.supplierIds),
          isNull(supplierRawItems.archivedAt),
          isNull(supplierRawItems.reviewedAt),
        ),
      )
      .groupBy(supplierRawItems.supplierId);

    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(row.supplierId, row.count);
    }
    return result;
  },

  async countByStatusForOrganisationVenue(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<{ pending: number; normalised: number; skipped: number }> {
    const rows = await tx
      .select({
        status: supplierRawItems.normalisationStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(supplierRawItems)
      .innerJoin(suppliers, eq(supplierRawItems.supplierId, suppliers.id))
      .where(
        and(
          supplierRawItemsRepo.venueScopeCondition(args.organisationId, args.venueId),
          or(
            isNull(supplierRawItems.isLikelyInventory),
            eq(supplierRawItems.isLikelyInventory, true),
          )!,
        )!,
      )
      .groupBy(supplierRawItems.normalisationStatus);

    const counts = { pending: 0, normalised: 0, skipped: 0 };
    for (const row of rows) {
      if (row.status === "pending") counts.pending = row.count;
      else if (row.status === "normalised") counts.normalised = row.count;
      else if (row.status === "skipped") counts.skipped = row.count;
    }
    return counts;
  },

  async findByIdForOrganisation(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; rawItemId: string },
  ): Promise<(SupplierRawItemRow & { supplierName: string }) | null> {
    const rows = await tx
      .select({
        row: supplierRawItems,
        supplierName: suppliers.name,
      })
      .from(supplierRawItems)
      .innerJoin(suppliers, eq(supplierRawItems.supplierId, suppliers.id))
      .where(
        and(
          eq(supplierRawItems.id, args.rawItemId),
          supplierRawItemsRepo.venueScopeCondition(args.organisationId, args.venueId),
        ),
      )
      .limit(1);

    const hit = rows[0];
    if (!hit) return null;
    return { ...hit.row, supplierName: hit.supplierName };
  },

  async listQueueForOrganisationVenue(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      status?: "pending" | "normalised" | "skipped";
    },
  ): Promise<Array<SupplierRawItemRow & { supplierName: string }>> {
    const conditions: SQL[] = [
      supplierRawItemsRepo.venueScopeCondition(args.organisationId, args.venueId),
      // Exclude items cleared as not-inventory in the supplier wizard.
      or(
        isNull(supplierRawItems.isLikelyInventory),
        eq(supplierRawItems.isLikelyInventory, true),
      )!,
    ];

    if (args.status) {
      conditions.push(eq(supplierRawItems.normalisationStatus, args.status));
    }

    if (args.search?.trim()) {
      const pattern = `%${args.search.trim().replace(/[%_]/g, "")}%`;
      conditions.push(
        or(
          ilike(supplierRawItems.rawDescription, pattern),
          ilike(suppliers.name, pattern),
        )!,
      );
    }

    const rows = await tx
      .select({
        row: supplierRawItems,
        supplierName: suppliers.name,
      })
      .from(supplierRawItems)
      .innerJoin(suppliers, eq(supplierRawItems.supplierId, suppliers.id))
      .where(and(...conditions))
      .orderBy(desc(supplierRawItems.lastSeenAt));

    return rows.map((r) => ({ ...r.row, supplierName: r.supplierName }));
  },

  async clearForVenueScope(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const supplierRows = await tx
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organisationId, args.organisationId),
          or(isNull(suppliers.venueId), eq(suppliers.venueId, args.venueId))!,
        ),
      );
    const supplierIds = supplierRows.map((row) => row.id);
    if (supplierIds.length === 0) {
      return 0;
    }
    const deleted = await tx
      .delete(supplierRawItems)
      .where(inArray(supplierRawItems.supplierId, supplierIds))
      .returning({ id: supplierRawItems.id });
    return deleted.length;
  },

  async listInvoiceLinesForAggregation(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<InvoiceLineForAggregation[]> {
    const rows = await tx
      .select({
        supplierId: venueInvoices.supplierId,
        invoiceId: venueInvoices.id,
        parsedDescription: venueInvoiceLineItems.parsedDescription,
        unit: venueInvoiceLineItems.unit,
        quantity: venueInvoiceLineItems.quantity,
        unitPriceCents: venueInvoiceLineItems.unitPriceCents,
        lineTotalCents: venueInvoiceLineItems.lineTotalCents,
        isLikelyInventory: venueInvoiceLineItems.isLikelyInventory,
        attachmentParsedAt: venueInvoices.attachmentParsedAt,
      })
      .from(venueInvoiceLineItems)
      .innerJoin(venueInvoices, eq(venueInvoiceLineItems.invoiceId, venueInvoices.id))
      .where(
        and(
          eq(venueInvoiceLineItems.organisationId, args.organisationId),
          eq(venueInvoiceLineItems.venueId, args.venueId),
          sql`${venueInvoices.supplierId} IS NOT NULL`,
        ),
      )
      // Oldest invoices first so the upsert's "last write wins" leaves each raw
      // item carrying its NEWEST invoice's price/date — which the re-import price
      // propagation then relies on for its forward-only guard.
      .orderBy(asc(venueInvoices.invoiceDate));

    return rows
      .filter((row) => row.supplierId && row.parsedDescription?.trim())
      .map((row) => ({
        supplierId: row.supplierId!,
        invoiceId: row.invoiceId,
        parsedDescription: row.parsedDescription,
        unit: row.unit,
        quantity: row.quantity,
        unitPriceCents: row.unitPriceCents,
        lineTotalCents: row.lineTotalCents,
        isLikelyInventory: row.isLikelyInventory,
        source: row.attachmentParsedAt ? "invoice_parse" : "xero_api",
      }));
  },

  /**
   * Reviewed raw items already linked to a supplier_product, each with the price
   * and date of its latest invoice. Feeds forward-only price propagation on
   * re-import. Multiple raw items can map to one product (multi-pack); the caller
   * dedupes to the newest invoice per product.
   */
  async listLinkedPricePropagationCandidates(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<LinkedPricePropagationCandidate[]> {
    const rows = await tx
      .select({
        supplierProductId: supplierRawItems.supplierProductId,
        newPriceCents: supplierRawItems.lastUnitPriceCents,
        invoiceId: supplierRawItems.lastInvoiceId,
        invoiceDate: venueInvoices.invoiceDate,
      })
      .from(supplierRawItems)
      .innerJoin(venueInvoices, eq(supplierRawItems.lastInvoiceId, venueInvoices.id))
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(venueInvoices.venueId, args.venueId),
          isNotNull(supplierRawItems.supplierProductId),
          isNotNull(supplierRawItems.reviewedAt),
          isNotNull(supplierRawItems.lastUnitPriceCents),
        ),
      );

    return rows
      .filter(
        (row): row is typeof row & { supplierProductId: string; invoiceId: string; newPriceCents: number } =>
          row.supplierProductId != null &&
          row.invoiceId != null &&
          row.newPriceCents != null,
      )
      .map((row) => ({
        supplierProductId: row.supplierProductId,
        newPriceCents: row.newPriceCents,
        invoiceId: row.invoiceId,
        invoiceDate: row.invoiceDate,
      }));
  },

  /**
   * Latest invoice price + date for specific raw items — lets the normalise
   * commit pick the freshest price across a base line and its folded
   * wording-drift twins. Rows without a linked invoice or price are omitted.
   */
  async listInvoiceDatedPricesByIds(
    tx: RlsTx,
    args: { organisationId: string; supplierId: string; rawItemIds: string[] },
  ): Promise<
    Array<{
      rawItemId: string;
      priceCents: number;
      invoiceId: string;
      invoiceDate: string;
    }>
  > {
    if (args.rawItemIds.length === 0) return [];
    const rows = await tx
      .select({
        rawItemId: supplierRawItems.id,
        priceCents: supplierRawItems.lastUnitPriceCents,
        invoiceId: supplierRawItems.lastInvoiceId,
        invoiceDate: venueInvoices.invoiceDate,
      })
      .from(supplierRawItems)
      .innerJoin(venueInvoices, eq(supplierRawItems.lastInvoiceId, venueInvoices.id))
      .where(
        and(
          eq(supplierRawItems.organisationId, args.organisationId),
          eq(supplierRawItems.supplierId, args.supplierId),
          inArray(supplierRawItems.id, args.rawItemIds),
          isNull(supplierRawItems.archivedAt),
        ),
      );

    return rows.filter(
      (
        row,
      ): row is typeof row & {
        priceCents: number;
        invoiceId: string;
        invoiceDate: string;
      } =>
        row.priceCents != null &&
        row.invoiceId != null &&
        row.invoiceDate != null,
    );
  },

  /**
   * Every parsed invoice line for a supplier, with its invoice's identity and
   * parse status. The service normalises each description and groups by it to
   * derive, per raw item, the distinct invoices it was seen on ("Invoice (N)").
   */
  async listLinesForSupplierSources(
    tx: RlsTx,
    args: { organisationId: string; supplierId: string },
  ): Promise<
    Array<{
      invoiceId: string;
      invoiceNumber: string | null;
      invoiceDate: string | null;
      attachmentParsedAt: string | null;
      parsedDescription: string | null;
    }>
  > {
    return tx
      .select({
        invoiceId: venueInvoices.id,
        invoiceNumber: venueInvoices.invoiceNumber,
        invoiceDate: venueInvoices.invoiceDate,
        attachmentParsedAt: venueInvoices.attachmentParsedAt,
        parsedDescription: venueInvoiceLineItems.parsedDescription,
      })
      .from(venueInvoiceLineItems)
      .innerJoin(venueInvoices, eq(venueInvoiceLineItems.invoiceId, venueInvoices.id))
      .where(
        and(
          eq(venueInvoiceLineItems.organisationId, args.organisationId),
          eq(venueInvoices.supplierId, args.supplierId),
          isNull(venueInvoices.archivedAt),
        ),
      );
  },

  /**
   * Parsed invoice lines for a supplier with their price + date — the raw
   * material for per-product price history in the review flow. Same join as
   * listLinesForSupplierSources, but keeps the unit price.
   */
  async listPriceLinesForSupplier(
    tx: RlsTx,
    args: { organisationId: string; supplierId: string },
  ): Promise<
    Array<{
      invoiceId: string;
      invoiceDate: string | null;
      parsedDescription: string | null;
      unitPriceCents: number | null;
    }>
  > {
    return tx
      .select({
        invoiceId: venueInvoices.id,
        invoiceDate: venueInvoices.invoiceDate,
        parsedDescription: venueInvoiceLineItems.parsedDescription,
        unitPriceCents: venueInvoiceLineItems.unitPriceCents,
      })
      .from(venueInvoiceLineItems)
      .innerJoin(venueInvoices, eq(venueInvoiceLineItems.invoiceId, venueInvoices.id))
      .where(
        and(
          eq(venueInvoiceLineItems.organisationId, args.organisationId),
          eq(venueInvoices.supplierId, args.supplierId),
          isNull(venueInvoices.archivedAt),
        ),
      );
  },

  async upsertFromLine(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      line: Omit<InvoiceLineForAggregation, "supplierId">;
      userId: string;
    },
  ): Promise<"inserted" | "updated" | "skipped"> {
    const description = args.line.parsedDescription?.trim();
    if (!description) return "skipped";

    const normalized = normalizeRawDescription(description);
    const unitNormalized = normalizeRawUnit(args.line.unit, description);
    const now = new Date().toISOString();
    const existing = await supplierRawItemsRepo.findByDedupeKey(tx, {
      supplierId: args.supplierId,
      rawDescriptionNormalized: normalized,
      rawUnitNormalized: unitNormalized,
    });

    const quantity =
      args.line.quantity != null ? String(args.line.quantity) : null;

    if (existing) {
      // "any contributing line was inventory" wins: true beats false/null.
      const mergedIsLikelyInventory =
        existing.isLikelyInventory === true || args.line.isLikelyInventory === true
          ? true
          : (args.line.isLikelyInventory ?? existing.isLikelyInventory);

      await supplierRawItemsRepo.update(tx, {
        rawItemId: existing.id,
        patch: {
          rawDescription: description,
          rawUnit: args.line.unit?.trim() || existing.rawUnit,
          lastQuantity: quantity,
          lastUnitPriceCents: args.line.unitPriceCents ?? existing.lastUnitPriceCents,
          lastLineTotalCents: args.line.lineTotalCents ?? existing.lastLineTotalCents,
          isLikelyInventory: mergedIsLikelyInventory,
          lastSeenAt: now,
          lastInvoiceId: args.line.invoiceId,
          source: args.line.source,
          updatedBy: args.userId,
        },
      });
      return "updated";
    }

    await supplierRawItemsRepo.create(tx, {
      organisationId: args.organisationId,
      supplierId: args.supplierId,
      rawDescription: description,
      rawDescriptionNormalized: normalized,
      rawUnit: args.line.unit?.trim() || null,
      rawUnitNormalized: unitNormalized,
      lastQuantity: quantity,
      lastUnitPriceCents: args.line.unitPriceCents,
      lastLineTotalCents: args.line.lineTotalCents,
      isLikelyInventory: args.line.isLikelyInventory,
      source: args.line.source,
      firstSeenAt: now,
      lastSeenAt: now,
      lastInvoiceId: args.line.invoiceId,
      normalisationStatus: "pending",
      createdBy: args.userId,
      updatedBy: args.userId,
    });
    return "inserted";
  },
};
