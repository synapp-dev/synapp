import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  max,
  notInArray,
  or,
  sql,
  sum,
  asc,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import type { AppDb } from "@/server/db/create-app-db";
import { suppliers, venueInvoices, venueXeroConnections } from "@/server/db/schema";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";

export type SupplierRow = typeof suppliers.$inferSelect;
export type SupplierInsert = typeof suppliers.$inferInsert;
export type SupplierUpdate = Partial<
  Omit<SupplierInsert, "id" | "organisationId">
>;

function venueScopeCondition(venueId: string): SQL {
  return or(isNull(suppliers.venueId), eq(suppliers.venueId, venueId))!;
}

export const suppliersRepo = {
  async listSuppliers(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      archived?: boolean;
      hasProducts?: boolean;
      sort?: "name" | "last_invoice" | "ytd_spend";
      page: number;
      pageSize: number;
    },
  ): Promise<{ rows: SupplierRow[]; total: number }> {
    const conditions: SQL[] = [
      eq(suppliers.organisationId, args.organisationId),
      venueScopeCondition(args.venueId),
    ];

    if (args.archived) {
      conditions.push(isNotNull(suppliers.archivedAt));
    } else {
      conditions.push(isNull(suppliers.archivedAt));
    }

    if (args.search?.trim()) {
      const raw = args.search
        .trim()
        .replace(/%/g, "")
        .replace(/_/g, "")
        .replace(/[(),]/g, "");
      if (raw.length > 0) {
        const pattern = `%${raw}%`;
        conditions.push(
          or(
            ilike(suppliers.name, pattern),
            ilike(suppliers.email, pattern),
            ilike(suppliers.phone, pattern),
            ilike(suppliers.abn, pattern),
            ilike(suppliers.contactPerson, pattern),
          )!,
        );
      }
    }

    if (args.category) {
      conditions.push(eq(suppliers.category, args.category));
    }

    if (args.status === "active") {
      conditions.push(eq(suppliers.active, true));
    } else if (args.status === "inactive") {
      conditions.push(eq(suppliers.active, false));
    }

    const where = and(...conditions);
    const offset = (args.page - 1) * args.pageSize;

    let orderBy = desc(suppliers.updatedAt);
    if (args.sort === "name") {
      orderBy = asc(suppliers.name);
    }

    const [rows, totalRow] = await Promise.all([
      tx
        .select()
        .from(suppliers)
        .where(where)
        .orderBy(orderBy)
        .limit(args.pageSize)
        .offset(offset),
      tx.select({ value: count() }).from(suppliers).where(where),
    ]);

    let filteredRows = rows;
    if (args.hasProducts !== undefined) {
      const supplierIds = rows.map((r) => r.id);
      const productCounts = await supplierProductsRepo.countBySupplierIds(tx, {
        organisationId: args.organisationId,
        supplierIds,
      });
      filteredRows = rows.filter((r) => {
        const count = productCounts.get(r.id) ?? 0;
        return args.hasProducts ? count > 0 : count === 0;
      });
    }

    return { rows: filteredRows, total: Number(totalRow[0]?.value ?? 0) };
  },

  async getSupplierMetrics(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; supplierIds: string[] },
  ): Promise<
    Map<
      string,
      { productCount: number; ytdSpendCents: number; lastInvoiceDate: string | null }
    >
  > {
    const result = new Map<
      string,
      { productCount: number; ytdSpendCents: number; lastInvoiceDate: string | null }
    >();
    if (args.supplierIds.length === 0) return result;

    for (const id of args.supplierIds) {
      result.set(id, { productCount: 0, ytdSpendCents: 0, lastInvoiceDate: null });
    }

    const productCounts = await supplierProductsRepo.countBySupplierIds(tx, {
      organisationId: args.organisationId,
      supplierIds: args.supplierIds,
    });
    for (const [id, count] of productCounts) {
      const entry = result.get(id);
      if (entry) entry.productCount = count;
    }

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const invoiceAgg = await tx
      .select({
        supplierId: venueInvoices.supplierId,
        ytdSpend: sum(venueInvoices.totalCents),
        lastInvoiceDate: max(venueInvoices.invoiceDate),
      })
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.venueId, args.venueId),
          inArray(venueInvoices.supplierId, args.supplierIds),
          sql`${venueInvoices.invoiceDate} >= ${yearStart}`,
        ),
      )
      .groupBy(venueInvoices.supplierId);

    for (const row of invoiceAgg) {
      if (!row.supplierId) continue;
      const entry = result.get(row.supplierId);
      if (entry) {
        entry.ytdSpendCents = Number(row.ytdSpend ?? 0);
        entry.lastInvoiceDate = row.lastInvoiceDate ?? null;
      }
    }

    return result;
  },

  async getSupplierById(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; supplierId: string },
  ): Promise<SupplierRow | null> {
    const rows = await tx
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, args.supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
          venueScopeCondition(args.venueId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async createSupplier(tx: RlsTx, row: SupplierInsert): Promise<SupplierRow> {
    const inserted = await tx.insert(suppliers).values(row).returning();
    const created = inserted[0];
    if (!created) {
      throw new Error("Failed to create supplier");
    }
    return created;
  },

  async updateSupplier(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      supplierId: string;
      row: SupplierUpdate;
    },
  ): Promise<SupplierRow | null> {
    const existing = await suppliersRepo.getSupplierById(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      supplierId: args.supplierId,
    });

    if (!existing) {
      return null;
    }

    const updated = await tx
      .update(suppliers)
      .set(args.row)
      .where(
        and(
          eq(suppliers.id, args.supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
        ),
      )
      .returning();

    return updated[0] ?? null;
  },

  async softDeleteSupplier(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; supplierId: string },
  ): Promise<boolean> {
    const existing = await suppliersRepo.getSupplierById(tx, args);
    if (!existing) {
      return false;
    }

    const now = new Date().toISOString();
    await supplierProductsRepo.archiveBySupplierId(tx, {
      organisationId: args.organisationId,
      supplierId: args.supplierId,
    });

    const updated = await tx
      .update(suppliers)
      .set({
        active: false,
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(suppliers.id, args.supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
        ),
      )
      .returning({ id: suppliers.id });

    return updated.length > 0;
  },

  async findByXeroContactId(
    tx: RlsTx,
    args: { organisationId: string; xeroContactId: string },
  ): Promise<SupplierRow | null> {
    const rows = await tx
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organisationId, args.organisationId),
          eq(suppliers.xeroContactId, args.xeroContactId),
          isNull(suppliers.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async listActiveForOrganisation(
    tx: RlsTx,
    organisationId: string,
  ): Promise<SupplierRow[]> {
    return tx
      .select()
      .from(suppliers)
      .where(
        and(eq(suppliers.organisationId, organisationId), isNull(suppliers.archivedAt)),
      );
  },

  async createFromXero(
    tx: RlsTx,
    row: SupplierInsert,
  ): Promise<SupplierRow> {
    return suppliersRepo.createSupplier(tx, row);
  },

  async updateFromXero(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      row: SupplierUpdate;
    },
  ): Promise<SupplierRow | null> {
    const updated = await tx
      .update(suppliers)
      .set({ ...args.row, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(suppliers.id, args.supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
        ),
      )
      .returning();
    return updated[0] ?? null;
  },

  async linkInvoicesToSuppliersByXeroContact(
    appDb: AppDb,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const supplierRows = await appDb.admin
      .select({ id: suppliers.id, xeroContactId: suppliers.xeroContactId })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organisationId, args.organisationId),
          isNotNull(suppliers.xeroContactId),
          isNull(suppliers.archivedAt),
        ),
      );

    const byContact = new Map(
      supplierRows
        .filter((s) => s.xeroContactId)
        .map((s) => [s.xeroContactId!, s.id]),
    );
    if (byContact.size === 0) return 0;

    const invoices = await appDb.admin
      .select({
        id: venueInvoices.id,
        xeroContactId: venueInvoices.xeroContactId,
        supplierId: venueInvoices.supplierId,
      })
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.venueId, args.venueId),
          isNotNull(venueInvoices.xeroContactId),
        ),
      );

    let linked = 0;
    const now = new Date().toISOString();

    for (const invoice of invoices) {
      if (!invoice.xeroContactId) continue;
      const supplierId = byContact.get(invoice.xeroContactId);
      if (!supplierId || invoice.supplierId === supplierId) continue;

      await appDb.admin
        .update(venueInvoices)
        .set({ supplierId, updatedAt: now })
        .where(eq(venueInvoices.id, invoice.id));
      linked += 1;
    }

    return linked;
  },

  /**
   * Enrich a supplier's contact/address details from a parsed invoice header, but only
   * when this invoice is at least as recent as the last one we sourced details from
   * (so the most-recent invoice wins). Only non-null parsed values overwrite existing data.
   */
  async enrichDetailsFromInvoice(
    tx: RlsTx,
    args: {
      organisationId: string;
      supplierId: string;
      invoiceDate: string;
      details: {
        abn: string | null;
        email: string | null;
        phone: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        suburb: string | null;
        state: string | null;
        postcode: string | null;
      };
    },
  ): Promise<boolean> {
    const set: SupplierUpdate = {
      detailsSourceInvoiceDate: args.invoiceDate,
      updatedAt: new Date().toISOString(),
    };
    const { details } = args;
    if (details.abn) set.abn = details.abn;
    if (details.email) set.email = details.email;
    if (details.phone) set.phone = details.phone;
    if (details.addressLine1) set.addressLine1 = details.addressLine1;
    if (details.addressLine2) set.addressLine2 = details.addressLine2;
    if (details.suburb) set.suburb = details.suburb;
    if (details.state) set.state = details.state;
    if (details.postcode) set.postcode = details.postcode;

    const updated = await tx
      .update(suppliers)
      .set(set)
      .where(
        and(
          eq(suppliers.id, args.supplierId),
          eq(suppliers.organisationId, args.organisationId),
          isNull(suppliers.archivedAt),
          or(
            isNull(suppliers.detailsSourceInvoiceDate),
            sql`${suppliers.detailsSourceInvoiceDate} <= ${args.invoiceDate}`,
          )!,
        ),
      )
      .returning({ id: suppliers.id });

    return updated.length > 0;
  },

  /** Active suppliers visible to a venue, for the inventory-source selection gate. */
  async listForVenueSelection(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<Array<{ id: string; name: string; isInventorySource: boolean }>> {
    return tx
      .select({
        id: suppliers.id,
        name: suppliers.name,
        isInventorySource: suppliers.isInventorySource,
      })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organisationId, args.organisationId),
          venueScopeCondition(args.venueId),
          isNull(suppliers.archivedAt),
        ),
      )
      .orderBy(asc(suppliers.name));
  },

  /**
   * Persist the inventory-source selection for a venue: the chosen suppliers
   * become `is_inventory_source = true`, every other visible supplier `false`.
   */
  async setInventorySourceForVenue(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      selectedSupplierIds: string[];
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const scope = and(
      eq(suppliers.organisationId, args.organisationId),
      venueScopeCondition(args.venueId),
      isNull(suppliers.archivedAt),
    )!;

    if (args.selectedSupplierIds.length > 0) {
      await tx
        .update(suppliers)
        .set({ isInventorySource: true, updatedAt: now })
        .where(and(scope, inArray(suppliers.id, args.selectedSupplierIds)));
    }

    await tx
      .update(suppliers)
      .set({ isInventorySource: false, updatedAt: now })
      .where(
        and(
          scope,
          args.selectedSupplierIds.length > 0
            ? notInArray(suppliers.id, args.selectedSupplierIds)
            : sql`true`,
        ),
      );
  },

  async markSupplierSyncSuccess(appDb: AppDb, venueId: string, syncedAt: string): Promise<void> {
    await appDb.admin
      .update(venueXeroConnections)
      .set({
        lastSupplierSyncAt: syncedAt,
        lastSupplierSyncError: null,
        updatedAt: syncedAt,
      })
      .where(eq(venueXeroConnections.venueId, venueId));
  },

  async markSupplierSyncError(appDb: AppDb, venueId: string, error: string): Promise<void> {
    await appDb.admin
      .update(venueXeroConnections)
      .set({
        lastSupplierSyncError: error,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(venueXeroConnections.venueId, venueId));
  },
};
