import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import {
  inboundEmailLog,
  ingredientOrderBuffers,
  ingredients,
  inventorySetupImportJobs,
  invoiceCostChangeEvents,
  menuItemGroups,
  menuItems,
  orderGuideCache,
  purchaseOrders,
  purchaseOrderNumberSequences,
  supplierProducts,
  supplierRawItems,
  suppliers,
  venueInvoiceAttachments,
  venueInvoiceLineItems,
  venueInvoices,
  venueModifierLists,
  venues,
  venueXeroConnections,
} from "@/server/db/schema";

export type InventorySetupRestartCounts = {
  suppliersRemoved: number;
  invoicesRemoved: number;
  rawItemsRemoved: number;
  purchaseOrdersRemoved: number;
  menuItemsRemoved: number;
  importJobsRemoved: number;
};

function venueSupplierScope(organisationId: string, venueId: string): SQL {
  return and(
    eq(suppliers.organisationId, organisationId),
    or(isNull(suppliers.venueId), eq(suppliers.venueId, venueId))!,
  )!;
}

export async function wipeVenueProcurementData(
  appDb: AppDb,
  args: { organisationId: string; venueId: string },
): Promise<InventorySetupRestartCounts> {
  const admin = appDb.admin;
  const { organisationId, venueId } = args;

  const supplierRows = await admin
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(venueSupplierScope(organisationId, venueId));
  const supplierIds = supplierRows.map((row) => row.id);

  await admin
    .update(ingredients)
    .set({
      supplierId: null,
      activeSupplierProductId: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(ingredients.organisationId, organisationId),
        eq(ingredients.venueId, venueId),
        or(
          isNotNull(ingredients.supplierId),
          isNotNull(ingredients.activeSupplierProductId),
        )!,
      ),
    );

  await admin
    .update(inboundEmailLog)
    .set({ linkedInvoiceId: null })
    .where(eq(inboundEmailLog.venueId, venueId));

  await admin
    .update(purchaseOrders)
    .set({ linkedInvoiceId: null })
    .where(eq(purchaseOrders.venueId, venueId));

  await admin
    .update(venueInvoices)
    .set({ purchaseOrderId: null, supplierId: null })
    .where(eq(venueInvoices.venueId, venueId));

  const invoiceIds = (
    await admin
      .select({ id: venueInvoices.id })
      .from(venueInvoices)
      .where(eq(venueInvoices.venueId, venueId))
  ).map((row) => row.id);

  if (invoiceIds.length > 0) {
    await admin
      .delete(invoiceCostChangeEvents)
      .where(inArray(invoiceCostChangeEvents.invoiceId, invoiceIds));
  }

  await admin
    .delete(venueInvoiceLineItems)
    .where(eq(venueInvoiceLineItems.venueId, venueId));

  await admin
    .delete(venueInvoiceAttachments)
    .where(eq(venueInvoiceAttachments.venueId, venueId));

  let rawItemsRemoved = 0;
  if (supplierIds.length > 0) {
    const rawDeleted = await admin
      .delete(supplierRawItems)
      .where(inArray(supplierRawItems.supplierId, supplierIds))
      .returning({ id: supplierRawItems.id });
    rawItemsRemoved = rawDeleted.length;
  }

  const poDeleted = await admin
    .delete(purchaseOrders)
    .where(eq(purchaseOrders.venueId, venueId))
    .returning({ id: purchaseOrders.id });

  await admin
    .delete(purchaseOrderNumberSequences)
    .where(eq(purchaseOrderNumberSequences.venueId, venueId));

  const invoicesDeleted = await admin
    .delete(venueInvoices)
    .where(eq(venueInvoices.venueId, venueId))
    .returning({ id: venueInvoices.id });

  await admin.delete(inboundEmailLog).where(eq(inboundEmailLog.venueId, venueId));
  await admin.delete(orderGuideCache).where(eq(orderGuideCache.venueId, venueId));
  await admin
    .delete(ingredientOrderBuffers)
    .where(eq(ingredientOrderBuffers.venueId, venueId));

  if (supplierIds.length > 0) {
    await admin
      .delete(supplierProducts)
      .where(inArray(supplierProducts.supplierId, supplierIds));
  }

  let suppliersRemoved = 0;
  if (supplierIds.length > 0) {
    const suppliersDeleted = await admin
      .delete(suppliers)
      .where(inArray(suppliers.id, supplierIds))
      .returning({ id: suppliers.id });
    suppliersRemoved = suppliersDeleted.length;
  }

  await admin
    .update(venueXeroConnections)
    .set({
      lastInvoiceSyncAt: null,
      lastInvoiceSyncError: null,
      lastSupplierSyncAt: null,
      lastSupplierSyncError: null,
    })
    .where(eq(venueXeroConnections.venueId, venueId));

  // POS catalog import. Deleting menu_items cascades recipes + square catalog
  // links (and nulls venue_square_order_lines.menu_item_id, preserving sales).
  // Deleting groups + modifier lists cascades their join/modifier rows.
  const menuItemsDeleted = await admin
    .delete(menuItems)
    .where(eq(menuItems.venueId, venueId))
    .returning({ id: menuItems.id });

  await admin.delete(menuItemGroups).where(eq(menuItemGroups.venueId, venueId));
  await admin
    .delete(venueModifierLists)
    .where(eq(venueModifierLists.venueId, venueId));

  // Import job history (xero + square_catalog) — resets posImportRan derivation.
  const importJobsDeleted = await admin
    .delete(inventorySetupImportJobs)
    .where(eq(inventorySetupImportJobs.venueId, venueId))
    .returning({ id: inventorySetupImportJobs.id });

  // Wizard acknowledgements / intro-seen — back to a fresh guided setup.
  await admin
    .update(venues)
    .set({ inventorySetupWizardState: {} })
    .where(eq(venues.id, venueId));

  return {
    suppliersRemoved,
    invoicesRemoved: invoicesDeleted.length,
    rawItemsRemoved,
    purchaseOrdersRemoved: poDeleted.length,
    menuItemsRemoved: menuItemsDeleted.length,
    importJobsRemoved: importJobsDeleted.length,
  };
}
