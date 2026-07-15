import { eq, inArray } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import {
  ingredients,
  recipeIngredients,
  recipes,
  venueInvoiceLineItems,
} from "@/server/db/schema";
import type { CostChangePreview } from "@/entities/invoices/model/types";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { invoicesRepo } from "@/server/invoices/invoices.repo";

export async function buildCostChangePreview(
  appDb: AppDb,
  invoiceId: string,
): Promise<CostChangePreview | null> {
  const lines = await appDb.admin
    .select()
    .from(venueInvoiceLineItems)
    .where(eq(venueInvoiceLineItems.invoiceId, invoiceId));

  const previewLines: CostChangePreview["lines"] = [];

  for (const line of lines) {
    if (!line.supplierProductId || line.unitPriceCents == null) continue;

    const products = await supplierProductsRepo.listActiveForVenue(appDb, {
      organisationId: line.organisationId,
      venueId: line.venueId,
    });
    const product = products.find((p) => p.id === line.supplierProductId);
    if (!product) continue;

    if (product.unitPriceCents === line.unitPriceCents) continue;

    previewLines.push({
      lineItemId: line.id,
      description: line.parsedDescription,
      supplierProductId: line.supplierProductId,
      oldPriceCents: product.unitPriceCents,
      newPriceCents: line.unitPriceCents,
    });
  }

  if (!previewLines.length) return null;

  const ingredientIds = new Set<string>();
  for (const line of lines) {
    if (line.ingredientId) ingredientIds.add(line.ingredientId);
  }

  let affectedRecipeCount = 0;
  if (ingredientIds.size) {
    const recipeRows = await appDb.admin
      .select({ recipeId: recipeIngredients.recipeId })
      .from(recipeIngredients)
      .where(inArray(recipeIngredients.ingredientId, [...ingredientIds]));
    affectedRecipeCount = new Set(recipeRows.map((r) => r.recipeId)).size;
  }

  return { lines: previewLines, affectedRecipeCount };
}

export async function applyCostPropagation(
  appDb: AppDb,
  args: {
    invoiceId: string;
    organisationId: string;
    venueId: string;
    userId: string;
    propagate: boolean;
    lineIdsToPropagate?: Set<string>;
  },
): Promise<number> {
  const lines = await appDb.admin
    .select()
    .from(venueInvoiceLineItems)
    .where(eq(venueInvoiceLineItems.invoiceId, args.invoiceId));

  let affectedRecipes = 0;
  const updatedIngredients = new Set<string>();

  for (const line of lines) {
    if (!line.supplierProductId || line.unitPriceCents == null) continue;
    if (args.lineIdsToPropagate && !args.lineIdsToPropagate.has(line.id)) continue;

    const products = await supplierProductsRepo.listActiveForVenue(appDb, {
      organisationId: args.organisationId,
      venueId: args.venueId,
    });
    const product = products.find((p) => p.id === line.supplierProductId);
    if (!product) continue;

    const oldPrice = product.unitPriceCents;
    const newPrice = line.unitPriceCents;

    if (oldPrice === newPrice) continue;

    await invoicesRepo.insertCostChangeEvent(appDb, {
      invoiceId: args.invoiceId,
      supplierProductId: line.supplierProductId,
      oldPriceCents: oldPrice,
      newPriceCents: newPrice,
      propagated: args.propagate,
      affectedRecipeCount: 0,
    });

    if (!args.propagate) continue;

    await supplierProductsRepo.updateUnitPrice(appDb, {
      id: line.supplierProductId,
      unitPriceCents: newPrice,
      updatedBy: args.userId,
    });

    if (line.ingredientId) {
      await appDb.admin
        .update(ingredients)
        .set({
          bestSupplierCostCents: newPrice,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ingredients.id, line.ingredientId));

      updatedIngredients.add(line.ingredientId);
    }
  }

  for (const ingredientId of updatedIngredients) {
    affectedRecipes += await recomputeRecipesForIngredient(appDb, ingredientId);
  }

  return affectedRecipes;
}

async function recomputeRecipesForIngredient(
  appDb: AppDb,
  ingredientId: string,
): Promise<number> {
  const ingRows = await appDb.admin
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, ingredientId))
    .limit(1);
  const ing = ingRows[0];
  if (!ing) return 0;

  const links = await appDb.admin
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.ingredientId, ingredientId));

  const recipeIds = [...new Set(links.map((l) => l.recipeId))];

  for (const recipeId of recipeIds) {
    const allLines = await appDb.admin
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    let totalCents = 0;
    for (const rl of allLines) {
      if (!rl.ingredientId) continue;
      const ingRow = await appDb.admin
        .select()
        .from(ingredients)
        .where(eq(ingredients.id, rl.ingredientId))
        .limit(1);
      const unitCost = ingRow[0]?.bestSupplierCostCents ?? ingRow[0]?.costPerUnitCents ?? 0;
      const qty = Number(rl.quantity) || 0;
      totalCents += Math.round(unitCost * qty);
    }

    const recipeRow = await appDb.admin
      .select({ serves: recipes.serves })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);
    const serves = recipeRow[0]?.serves ?? 1;
    const perServe = Math.round(totalCents / Math.max(serves, 1));

    await appDb.admin
      .update(recipes)
      .set({ costPerServeCents: perServe, updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, recipeId));
  }

  return recipeIds.length;
}
