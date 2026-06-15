import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  inboundEmailLog,
  invoiceCostChangeEvents,
  organisationPurchasingSettings,
  venueEmailInboxes,
  venueInvoiceAttachments,
  venueInvoiceAuditLog,
  venueInvoiceLineItems,
  venueInvoices,
  venueXeroConnections,
} from "@/server/db/schema";

export type VenueInvoiceDbRow = typeof venueInvoices.$inferSelect;
export type VenueInvoiceInsert = typeof venueInvoices.$inferInsert;
export type VenueInvoiceLineItemInsert = typeof venueInvoiceLineItems.$inferInsert;

type AdminDb = Pick<AppDb, "admin">;

export const invoicesRepo = {
  async getInvoiceById(
    tx: RlsTx,
    venueId: string,
    invoiceId: string,
  ): Promise<VenueInvoiceDbRow | null> {
    const rows = await tx
      .select()
      .from(venueInvoices)
      .where(and(eq(venueInvoices.id, invoiceId), eq(venueInvoices.venueId, venueId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async listInvoices(
    tx: RlsTx,
    args: {
      venueId: string;
      supplierId?: string;
      fromDate?: string;
      toDate?: string;
      reviewStatus?: string | string[];
    },
  ): Promise<VenueInvoiceDbRow[]> {
    const conditions = [eq(venueInvoices.venueId, args.venueId)];
    if (args.supplierId) conditions.push(eq(venueInvoices.supplierId, args.supplierId));
    if (args.fromDate) conditions.push(gte(venueInvoices.invoiceDate, args.fromDate));
    if (args.toDate) conditions.push(lte(venueInvoices.invoiceDate, args.toDate));
    if (args.reviewStatus) {
      const statuses = Array.isArray(args.reviewStatus)
        ? args.reviewStatus
        : [args.reviewStatus];
      conditions.push(inArray(venueInvoices.reviewStatus, statuses));
    }

    return tx
      .select()
      .from(venueInvoices)
      .where(and(...conditions))
      .orderBy(desc(venueInvoices.invoiceDate), desc(venueInvoices.syncedAt));
  },

  async countByReviewStatus(
    tx: RlsTx,
    venueId: string,
  ): Promise<Record<string, number>> {
    const rows = await tx
      .select({
        reviewStatus: venueInvoices.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(venueInvoices)
      .where(eq(venueInvoices.venueId, venueId))
      .groupBy(venueInvoices.reviewStatus);

    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.reviewStatus] = row.count;
    }
    return out;
  },

  async getReviewStatusAdmin(
    appDb: AdminDb,
    venueId: string,
    xeroInvoiceId: string,
  ): Promise<string | null> {
    const rows = await appDb.admin
      .select({ reviewStatus: venueInvoices.reviewStatus })
      .from(venueInvoices)
      .where(
        and(eq(venueInvoices.venueId, venueId), eq(venueInvoices.xeroInvoiceId, xeroInvoiceId)),
      )
      .limit(1);
    return rows[0]?.reviewStatus ?? null;
  },

  async findDuplicateCandidate(
    appDb: AdminDb,
    args: {
      venueId: string;
      invoiceNumber: string | null;
      supplierId: string | null;
      supplierName: string | null;
      totalCents: number;
      excludeInvoiceId?: string;
    },
  ): Promise<VenueInvoiceDbRow | null> {
    if (!args.invoiceNumber) return null;

    const tolerance = Math.max(100, Math.round(Math.abs(args.totalCents) * 0.01));
    const minTotal = args.totalCents - tolerance;
    const maxTotal = args.totalCents + tolerance;

    const rows = await appDb.admin
      .select()
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.venueId, args.venueId),
          eq(venueInvoices.invoiceNumber, args.invoiceNumber),
          gte(venueInvoices.totalCents, minTotal),
          lte(venueInvoices.totalCents, maxTotal),
          args.excludeInvoiceId
            ? sql`${venueInvoices.id} <> ${args.excludeInvoiceId}`
            : sql`true`,
        ),
      )
      .limit(1);

    const candidate = rows[0];
    if (!candidate) return null;

    if (args.supplierId && candidate.supplierId === args.supplierId) return candidate;
    if (
      args.supplierName &&
      candidate.supplierName?.toLowerCase() === args.supplierName.toLowerCase()
    ) {
      return candidate;
    }
    return null;
  },

  async insertInvoice(appDb: AdminDb, row: VenueInvoiceInsert): Promise<VenueInvoiceDbRow> {
    const rows = await appDb.admin.insert(venueInvoices).values(row).returning();
    return rows[0]!;
  },

  async upsertXeroInvoice(appDb: AdminDb, row: VenueInvoiceInsert): Promise<void> {
    if (!row.xeroInvoiceId) {
      throw new Error("xeroInvoiceId required for upsert");
    }
    await appDb.admin
      .insert(venueInvoices)
      .values(row)
      .onConflictDoUpdate({
        target: [venueInvoices.venueId, venueInvoices.xeroInvoiceId],
        set: {
          invoiceNumber: row.invoiceNumber,
          supplierName: row.supplierName,
          supplierId: row.supplierId,
          xeroContactId: row.xeroContactId,
          invoiceDate: row.invoiceDate,
          dueDate: row.dueDate,
          documentType: row.documentType,
          totalCents: row.totalCents,
          amountDueCents: row.amountDueCents,
          subtotalCents: row.subtotalCents,
          gstCents: row.gstCents,
          currencyCode: row.currencyCode,
          xeroStatus: row.xeroStatus,
          reviewStatus: row.reviewStatus,
          source: row.source,
          reference: row.reference,
          xeroUpdatedAt: row.xeroUpdatedAt,
          syncedAt: row.syncedAt,
          updatedAt: row.updatedAt,
          purchaseOrderId: row.purchaseOrderId,
          matchMethod: row.matchMethod,
        },
      });
  },

  async updateInvoice(
    tx: RlsTx,
    invoiceId: string,
    patch: Partial<VenueInvoiceInsert>,
  ): Promise<VenueInvoiceDbRow | null> {
    const rows = await tx
      .update(venueInvoices)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(venueInvoices.id, invoiceId))
      .returning();
    return rows[0] ?? null;
  },

  async updateInvoiceAdmin(
    appDb: AdminDb,
    invoiceId: string,
    patch: Partial<VenueInvoiceInsert>,
  ): Promise<void> {
    await appDb.admin
      .update(venueInvoices)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(venueInvoices.id, invoiceId));
  },

  async replaceLineItems(
    appDb: AdminDb,
    args: {
      invoiceId: string;
      organisationId: string;
      venueId: string;
      lines: Array<
        Omit<VenueInvoiceLineItemInsert, "invoiceId" | "organisationId" | "venueId" | "quantity"> & {
          quantity?: number | string | null;
        }
      >;
    },
  ): Promise<void> {
    await appDb.admin
      .delete(venueInvoiceLineItems)
      .where(eq(venueInvoiceLineItems.invoiceId, args.invoiceId));

    if (!args.lines.length) return;

    await appDb.admin.insert(venueInvoiceLineItems).values(
      args.lines.map((line, index) => ({
        ...line,
        quantity: line.quantity != null ? String(line.quantity) : null,
        invoiceId: args.invoiceId,
        organisationId: args.organisationId,
        venueId: args.venueId,
        sortOrder: line.sortOrder ?? index,
      })),
    );
  },

  async listLineItems(tx: RlsTx, invoiceId: string) {
    return tx
      .select()
      .from(venueInvoiceLineItems)
      .where(eq(venueInvoiceLineItems.invoiceId, invoiceId))
      .orderBy(venueInvoiceLineItems.sortOrder);
  },

  async updateLineItem(
    tx: RlsTx,
    lineId: string,
    patch: Partial<VenueInvoiceLineItemInsert>,
  ) {
    const rows = await tx
      .update(venueInvoiceLineItems)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(venueInvoiceLineItems.id, lineId))
      .returning();
    return rows[0] ?? null;
  },

  async listAttachments(tx: RlsTx, invoiceId: string) {
    return tx
      .select()
      .from(venueInvoiceAttachments)
      .where(eq(venueInvoiceAttachments.invoiceId, invoiceId));
  },

  async insertAttachment(appDb: AdminDb, row: typeof venueInvoiceAttachments.$inferInsert) {
    const rows = await appDb.admin.insert(venueInvoiceAttachments).values(row).returning();
    return rows[0]!;
  },

  async insertAudit(
    tx: RlsTx,
    row: typeof venueInvoiceAuditLog.$inferInsert,
  ): Promise<void> {
    await tx.insert(venueInvoiceAuditLog).values(row);
  },

  async listAudit(tx: RlsTx, invoiceId: string) {
    return tx
      .select()
      .from(venueInvoiceAuditLog)
      .where(eq(venueInvoiceAuditLog.invoiceId, invoiceId))
      .orderBy(desc(venueInvoiceAuditLog.changedAt));
  },

  async insertCostChangeEvent(
    appDb: AdminDb,
    row: typeof invoiceCostChangeEvents.$inferInsert,
  ): Promise<void> {
    await appDb.admin.insert(invoiceCostChangeEvents).values(row);
  },

  async getConnectionSummaryRls(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({
        xeroTenantId: venueXeroConnections.xeroTenantId,
        xeroTenantName: venueXeroConnections.xeroTenantName,
        lastInvoiceSyncAt: venueXeroConnections.lastInvoiceSyncAt,
        lastInvoiceSyncError: venueXeroConnections.lastInvoiceSyncError,
        updatedAt: venueXeroConnections.updatedAt,
      })
      .from(venueXeroConnections)
      .where(eq(venueXeroConnections.venueId, venueId))
      .limit(1);
    const row = rows[0];
    return row?.xeroTenantId ? row : null;
  },

  async updateConnectionSyncError(appDb: AdminDb, venueId: string, error: string): Promise<void> {
    await appDb.admin
      .update(venueXeroConnections)
      .set({ lastInvoiceSyncError: error, updatedAt: new Date().toISOString() })
      .where(eq(venueXeroConnections.venueId, venueId));
  },

  async markConnectionSyncSuccess(appDb: AdminDb, venueId: string, syncedAt: string): Promise<void> {
    await appDb.admin
      .update(venueXeroConnections)
      .set({
        lastInvoiceSyncAt: syncedAt,
        lastInvoiceSyncError: null,
        updatedAt: syncedAt,
      })
      .where(eq(venueXeroConnections.venueId, venueId));
  },

  async getInvoiceApprovalThreshold(tx: RlsTx, organisationId: string): Promise<number> {
    const rows = await tx
      .select({ threshold: organisationPurchasingSettings.invoiceApprovalThresholdCents })
      .from(organisationPurchasingSettings)
      .where(eq(organisationPurchasingSettings.organisationId, organisationId))
      .limit(1);
    return rows[0]?.threshold ?? 250_000;
  },

  async getVenueInbox(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select()
      .from(venueEmailInboxes)
      .where(eq(venueEmailInboxes.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async ensureVenueInbox(
    appDb: AdminDb,
    args: { organisationId: string; venueId: string; venueSlug: string },
  ) {
    const existing = await appDb.admin
      .select()
      .from(venueEmailInboxes)
      .where(eq(venueEmailInboxes.venueId, args.venueId))
      .limit(1);

    if (existing[0]) return existing[0];

    const address = `${args.venueSlug}@inbox.supersolt.com`;
    const rows = await appDb.admin
      .insert(venueEmailInboxes)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        address,
        status: "active",
      })
      .onConflictDoNothing()
      .returning();

    if (rows[0]) return rows[0];

    const fallback = await appDb.admin
      .select()
      .from(venueEmailInboxes)
      .where(eq(venueEmailInboxes.venueId, args.venueId))
      .limit(1);
    return fallback[0] ?? null;
  },

  async insertInboundEmail(appDb: AdminDb, row: typeof inboundEmailLog.$inferInsert) {
    const rows = await appDb.admin.insert(inboundEmailLog).values(row).returning();
    return rows[0]!;
  },

  async listStalePendingReview(appDb: Pick<AppDb, "admin">, olderThanIso: string) {
    return appDb.admin
      .select({
        id: venueInvoices.id,
        venueId: venueInvoices.venueId,
        organisationId: venueInvoices.organisationId,
        supplierName: venueInvoices.supplierName,
        totalCents: venueInvoices.totalCents,
        syncedAt: venueInvoices.syncedAt,
      })
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.reviewStatus, "pending_review"),
          lte(venueInvoices.syncedAt, olderThanIso),
        ),
      );
  },
};
