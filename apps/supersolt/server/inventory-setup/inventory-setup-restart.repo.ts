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
  menuItemRecipes,
  menuItems,
  orderGuideCache,
  purchaseOrders,
  purchaseOrderNumberSequences,
  recipeAllergens,
  recipeIngredients,
  recipeMethodSteps,
  recipes,
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

export type InventorySetupNormalisationResetCounts = {
  itemsReset: number;
  productsRemoved: number;
};

export type InventorySetupProductsResetCounts = {
  recipesRemoved: number;
  mappingsRemoved: number;
};

export type SupplierApprovalsResetCounts = {
  itemsReset: number;
  productsRemoved: number;
  suppliersReactivated: number;
};

function venueSupplierScope(organisationId: string, venueId: string): SQL {
  return and(
    eq(suppliers.organisationId, organisationId),
    or(isNull(suppliers.venueId), eq(suppliers.venueId, venueId))!,
  )!;
}

/**
 * Resets just the normalisation (inventory) stage: every raw item goes back to
 * "pending" with its product link and cached AI suggestion cleared, and the
 * supplier products the wizard created are removed. Suppliers, invoices, POS,
 * and the ingredients themselves are left intact — only the supplier links on
 * ingredients are dropped so the products can be deleted cleanly.
 */
export async function resetVenueNormalisation(
  appDb: AppDb,
  args: { organisationId: string; venueId: string },
): Promise<InventorySetupNormalisationResetCounts> {
  const admin = appDb.admin;
  const { organisationId, venueId } = args;

  const supplierRows = await admin
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(venueSupplierScope(organisationId, venueId));
  const supplierIds = supplierRows.map((row) => row.id);
  if (supplierIds.length === 0) {
    return { itemsReset: 0, productsRemoved: 0 };
  }

  // Drop the supplier links the wizard set on ingredients so their supplier
  // products can be deleted without dangling references (ingredients are kept).
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

  // Re-queue every raw item: clear the normalised status, the product link and
  // the cached AI suggestion so the wizard runs from scratch. Done before the
  // product delete so raw_items.supplier_product_id no longer references them.
  const itemsReset = await admin
    .update(supplierRawItems)
    .set({
      normalisationStatus: "pending",
      supplierProductId: null,
      normalisationSuggestion: null,
      updatedAt: new Date().toISOString(),
    })
    .where(inArray(supplierRawItems.supplierId, supplierIds))
    .returning({ id: supplierRawItems.id });

  const productsDeleted = await admin
    .delete(supplierProducts)
    .where(inArray(supplierProducts.supplierId, supplierIds))
    .returning({ id: supplierProducts.id });

  return {
    itemsReset: itemsReset.length,
    productsRemoved: productsDeleted.length,
  };
}

/**
 * Undoes the Suppliers-stage review state — the inverse of Smart Fill (or the
 * wizard's Items step): every raw item goes back to unreviewed with no product
 * link, the supplier_products created from approvals are removed, and any
 * supplier Smart Fill deactivated + parked for having zero items is
 * reactivated and un-parked. Detected raw items themselves, invoices, and Xero
 * sync history are untouched.
 */
export async function resetVenueSupplierApprovals(
  appDb: AppDb,
  args: { organisationId: string; venueId: string },
): Promise<SupplierApprovalsResetCounts> {
  const admin = appDb.admin;
  const { organisationId, venueId } = args;

  const supplierRows = await admin
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(venueSupplierScope(organisationId, venueId));
  const supplierIds = supplierRows.map((row) => row.id);
  if (supplierIds.length === 0) {
    return { itemsReset: 0, productsRemoved: 0, suppliersReactivated: 0 };
  }

  // Drop stale ingredient links before deleting the products they may point to.
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

  // Back to "detected, not reviewed" — done before the product delete so
  // raw_items.supplier_product_id no longer references them.
  const itemsReset = await admin
    .update(supplierRawItems)
    .set({
      reviewedAt: null,
      reviewedBy: null,
      supplierProductId: null,
      normalisationStatus: "pending",
      normalisationSuggestion: null,
      updatedAt: new Date().toISOString(),
    })
    .where(inArray(supplierRawItems.supplierId, supplierIds))
    .returning({ id: supplierRawItems.id });

  const productsDeleted = await admin
    .delete(supplierProducts)
    .where(inArray(supplierProducts.supplierId, supplierIds))
    .returning({ id: supplierProducts.id });

  // Reactivate + un-park only suppliers Smart Fill deactivated (active: false
  // is its signature) — a supplier a user manually parked while keeping it
  // active is left alone.
  const suppliersReactivated = await admin
    .update(suppliers)
    .set({
      active: true,
      noCatalogAckedAt: null,
      noCatalogAckedBy: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(inArray(suppliers.id, supplierIds), eq(suppliers.active, false)))
    .returning({ id: suppliers.id });

  return {
    itemsReset: itemsReset.length,
    productsRemoved: productsDeleted.length,
    suppliersReactivated: suppliersReactivated.length,
  };
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

/**
 * Resets just the products (recipes) stage: unmaps every POS line, clears the
 * menu-item costings, and deletes the venue's recipes so the recipe wizard can
 * run from scratch. The imported POS catalogue (menu items, groups, modifiers,
 * in-use flags), ingredients, and stock levels are left intact.
 */
export async function resetVenueProducts(
  appDb: AppDb,
  args: { organisationId: string; venueId: string },
): Promise<InventorySetupProductsResetCounts> {
  const admin = appDb.admin;
  const { organisationId, venueId } = args;

  const menuItemRows = await admin
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.organisationId, organisationId), eq(menuItems.venueId, venueId)));
  const menuItemIds = menuItemRows.map((row) => row.id);

  let mappingsRemoved = 0;
  if (menuItemIds.length > 0) {
    const deletedLinks = await admin
      .delete(menuItemRecipes)
      .where(inArray(menuItemRecipes.menuItemId, menuItemIds))
      .returning({ id: menuItemRecipes.id });
    mappingsRemoved = deletedLinks.length;

    // Columns are NOT NULL default 0 — the POS list reads "unmapped" from the
    // missing recipe link, not from these.
    await admin
      .update(menuItems)
      .set({ costPerServeCents: 0, gpPercent: 0, updatedAt: new Date().toISOString() })
      .where(
        and(eq(menuItems.organisationId, organisationId), eq(menuItems.venueId, venueId)),
      );
  }

  const recipeRows = await admin
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.organisationId, organisationId), eq(recipes.venueId, venueId)));
  const recipeIds = recipeRows.map((row) => row.id);

  let recipesRemoved = 0;
  if (recipeIds.length > 0) {
    await admin
      .delete(recipeIngredients)
      .where(inArray(recipeIngredients.recipeId, recipeIds));
    await admin
      .delete(recipeMethodSteps)
      .where(inArray(recipeMethodSteps.recipeId, recipeIds));
    await admin
      .delete(recipeAllergens)
      .where(inArray(recipeAllergens.recipeId, recipeIds));
    const deletedRecipes = await admin
      .delete(recipes)
      .where(inArray(recipes.id, recipeIds))
      .returning({ id: recipes.id });
    recipesRemoved = deletedRecipes.length;
  }

  return { recipesRemoved, mappingsRemoved };
}
