import {
  and,
  desc,
  eq,
  ilike,
  inArray,
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
import { normalizeRawDescription } from "@/server/supplier-raw-items/normalize-raw-description";

export type SupplierRawItemRow = typeof supplierRawItems.$inferSelect;
export type SupplierRawItemInsert = typeof supplierRawItems.$inferInsert;
export type RawItemSource = "xero_api" | "invoice_parse" | "manual";

export type InvoiceLineForAggregation = {
  supplierId: string;
  invoiceId: string;
  parsedDescription: string | null;
  unit: string | null;
  quantity: string | number | null;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  source: RawItemSource;
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
    args: { supplierId: string; rawDescriptionNormalized: string },
  ): Promise<SupplierRawItemRow | null> {
    const rows = await tx
      .select()
      .from(supplierRawItems)
      .where(
        and(
          eq(supplierRawItems.supplierId, args.supplierId),
          eq(supplierRawItems.rawDescriptionNormalized, args.rawDescriptionNormalized),
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
      .where(supplierRawItemsRepo.venueScopeCondition(args.organisationId, args.venueId))
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
      );

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
        source: row.attachmentParsedAt ? "invoice_parse" : "xero_api",
      }));
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
    const now = new Date().toISOString();
    const existing = await supplierRawItemsRepo.findByDedupeKey(tx, {
      supplierId: args.supplierId,
      rawDescriptionNormalized: normalized,
    });

    const quantity =
      args.line.quantity != null ? String(args.line.quantity) : null;

    if (existing) {
      await supplierRawItemsRepo.update(tx, {
        rawItemId: existing.id,
        patch: {
          rawDescription: description,
          rawUnit: args.line.unit?.trim() || existing.rawUnit,
          lastQuantity: quantity,
          lastUnitPriceCents: args.line.unitPriceCents ?? existing.lastUnitPriceCents,
          lastLineTotalCents: args.line.lineTotalCents ?? existing.lastLineTotalCents,
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
      lastQuantity: quantity,
      lastUnitPriceCents: args.line.unitPriceCents,
      lastLineTotalCents: args.line.lineTotalCents,
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
