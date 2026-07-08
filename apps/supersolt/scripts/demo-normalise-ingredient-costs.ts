/**
 * Demo-prep data fix: make ingredient costs realistic.
 *
 * The bulk normalisation autofill stored many PACK prices as PER-UNIT costs
 * (e.g. a $28.21 8×1L almond-milk pack saved as $28.21/L), which makes recipe
 * GPs nonsensical. This script:
 *   1. Backs up current ingredient + supplier product values to a JSON file.
 *   2. Deactivates orphan ingredients (no supplier product, unused in recipes)
 *      left behind by earlier raw-data regenerations — kills duplicate
 *      dropdown entries.
 *   3. Runs an LLM pass over the remaining ingredients: keeps the invoiced
 *      pack price as truth, corrects the pack CONTENTS (units per pack) and
 *      the derived cost-per-unit to realistic AU wholesale numbers.
 *   4. Recomputes recipe ingredient-line snapshots + recipe / menu item costs.
 *
 * Run from apps/supersolt:
 *   npx tsx scripts/demo-normalise-ingredient-costs.ts [org-slug] [venue-slug]
 * Defaults to piccolo-panini-bar / hawthorn-vic. Add --dry-run to preview.
 */

import { config } from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

const ORG_SLUG = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "piccolo-panini-bar";
const VENUE_SLUG = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "hawthorn-vic";
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;

const UNIT_VALUES = ["g", "kg", "mL", "L", "each"] as const;
type FixUnit = (typeof UNIT_VALUES)[number];

/** Tolerant unit normalisation — the model drifts ("ea", "ml", "litre"). */
function normaliseUnit(value: string): FixUnit | null {
  const cleaned = value.trim().toLowerCase();
  const map: Record<string, FixUnit> = {
    g: "g", gram: "g", grams: "g", gm: "g",
    kg: "kg", kilo: "kg", kilogram: "kg", kilograms: "kg",
    ml: "mL", mls: "mL", millilitre: "mL", millilitres: "mL",
    l: "L", lt: "L", ltr: "L", litre: "L", litres: "L", liter: "L",
    each: "each", ea: "each", unit: "each", piece: "each", pieces: "each", pc: "each",
  };
  return map[cleaned] ?? null;
}

async function main() {
  const { and, eq, inArray, isNull, sql } = await import("drizzle-orm");
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const schema = await import("@/server/db/schema");
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateObject } = await import("ai");
  const { z } = await import("zod");

  const appDb = createServiceAppDb();
  const db = appDb.admin;

  const venueRows = await db
    .select({ venueId: schema.venues.id })
    .from(schema.venues)
    .innerJoin(schema.organisations, eq(schema.organisations.id, schema.venues.organisationId))
    .where(and(eq(schema.organisations.slug, ORG_SLUG), eq(schema.venues.slug, VENUE_SLUG)));
  const venueId = venueRows[0]?.venueId;
  if (!venueId) throw new Error(`Venue not found for ${ORG_SLUG}/${VENUE_SLUG}`);
  console.info(`[demo-fix] venue ${VENUE_SLUG} (${venueId})${DRY_RUN ? " — DRY RUN" : ""}`);

  // ---- 1. Backup --------------------------------------------------------
  const ingredientRows = await db
    .select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.venueId, venueId));
  const productRows = await db
    .select()
    .from(schema.supplierProducts)
    .where(eq(schema.supplierProducts.venueId, venueId));
  const backupPath = path.join(
    os.tmpdir(),
    `supersolt-demo-fix-backup-${VENUE_SLUG}-${Date.now()}.json`,
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ ingredients: ingredientRows, supplierProducts: productRows }, null, 2),
  );
  console.info(`[demo-fix] backup written: ${backupPath} (${ingredientRows.length} ingredients, ${productRows.length} products)`);

  // ---- 2. Deactivate orphan duplicates ----------------------------------
  const usedInRecipes = await db
    .select({ ingredientId: schema.recipeIngredients.ingredientId })
    .from(schema.recipeIngredients)
    .innerJoin(schema.recipes, eq(schema.recipes.id, schema.recipeIngredients.recipeId))
    .where(eq(schema.recipes.venueId, venueId));
  const usedIds = new Set(usedInRecipes.map((r) => r.ingredientId).filter(Boolean) as string[]);

  const productByIngredient = new Map<string, (typeof productRows)[number]>();
  for (const product of productRows) {
    if (product.archivedAt || !product.ingredientId) continue;
    const existing = productByIngredient.get(product.ingredientId);
    // Prefer the active costing source; otherwise keep the first seen.
    if (!existing || product.isActiveForIngredient) {
      productByIngredient.set(product.ingredientId, product);
    }
  }

  const activeIngredients = ingredientRows.filter((row) => row.status === "active");
  const orphanIds = activeIngredients
    .filter((row) => !productByIngredient.has(row.id) && !usedIds.has(row.id))
    .map((row) => row.id);

  if (orphanIds.length > 0 && !DRY_RUN) {
    await db
      .update(schema.ingredients)
      .set({ status: "inactive", isActive: false, updatedAt: new Date().toISOString() })
      .where(inArray(schema.ingredients.id, orphanIds));
  }
  console.info(`[demo-fix] orphan ingredients deactivated: ${orphanIds.length}`);

  // ---- 3. LLM cost/pack correction --------------------------------------
  const rawByProduct = new Map<string, { description: string; priceCents: number | null }[]>();
  if (productByIngredient.size > 0) {
    // Raw items are venue-scoped through their supplier, not directly.
    const rawRows = await db
      .select({
        productId: schema.supplierRawItems.supplierProductId,
        description: schema.supplierRawItems.rawDescription,
        priceCents: schema.supplierRawItems.lastUnitPriceCents,
      })
      .from(schema.supplierRawItems)
      .innerJoin(
        schema.suppliers,
        eq(schema.suppliers.id, schema.supplierRawItems.supplierId),
      )
      .where(
        and(
          eq(schema.suppliers.venueId, venueId),
          isNull(schema.supplierRawItems.archivedAt),
        ),
      );
    for (const raw of rawRows) {
      if (!raw.productId) continue;
      const list = rawByProduct.get(raw.productId) ?? [];
      if (list.length < 3) list.push({ description: raw.description, priceCents: raw.priceCents });
      rawByProduct.set(raw.productId, list);
    }
  }

  type FixTarget = {
    ingredientId: string;
    name: string;
    currentUnit: string;
    currentCostCents: number;
    unitLocked: boolean;
    product: {
      id: string;
      packPriceCents: number;
      packLabel: string;
      unitsPerPack: string;
      packUnit: string;
      rawDescriptions: string[];
    } | null;
  };

  const targets: FixTarget[] = activeIngredients
    .filter((row) => productByIngredient.has(row.id) || usedIds.has(row.id))
    .map((row) => {
      const product = productByIngredient.get(row.id) ?? null;
      return {
        ingredientId: row.id,
        name: row.name,
        currentUnit: row.unit,
        currentCostCents: row.costPerUnitCents,
        unitLocked: usedIds.has(row.id),
        product: product
          ? {
              id: product.id,
              packPriceCents: product.unitPriceCents,
              packLabel: product.packLabel,
              unitsPerPack: String(product.unitsPerPack),
              packUnit: product.packUnit,
              rawDescriptions: (rawByProduct.get(product.id) ?? []).map((r) => r.description),
            }
          : null,
      };
    });
  console.info(`[demo-fix] ingredients to correct: ${targets.length}`);

  // Tolerant schema: units as free text (normalised in code), numbers coerced.
  // Strict enums made haiku's occasional "ea"/"ml" drift fail whole batches.
  const fixSchema = z.object({
    items: z.array(
      z.object({
        ingredientId: z.string(),
        unit: z.string().describe("Base stock unit: one of g, kg, mL, L, each"),
        costPerUnitCents: z.coerce
          .number()
          .describe("Realistic AU wholesale cost of ONE unit, in cents (integer)"),
        unitsPerPack: z.coerce
          .number()
          .describe("Physical contents of one invoiced pack, expressed in packUnit"),
        packUnit: z.string().describe("One of g, kg, mL, L, each"),
      }),
    ),
  });

  const updates = new Map<string, { unit: FixUnit; costPerUnitCents: number; unitsPerPack: number; packUnit: FixUnit }>();

  for (let start = 0; start < targets.length; start += BATCH_SIZE) {
    const batch = targets.slice(start, start + BATCH_SIZE);
    const lines = batch.map((t) => {
      const base = `- ingredientId ${t.ingredientId} | ${t.name} | current unit: ${t.currentUnit}${t.unitLocked ? " (LOCKED — a recipe references this unit, do not change it)" : ""} | current cost/unit: $${(t.currentCostCents / 100).toFixed(2)}`;
      if (!t.product) return `${base} | no supplier pack on file — estimate a realistic wholesale cost directly`;
      return (
        `${base} | invoiced pack price (TRUTH, do not change): $${(t.product.packPriceCents / 100).toFixed(2)}` +
        ` | stored pack: ${t.product.unitsPerPack} ${t.product.packUnit} per "${t.product.packLabel}"` +
        ` | invoice wording: ${t.product.rawDescriptions.slice(0, 2).join(" / ") || "(none)"}`
      );
    });

    const prompt =
      "You are fixing ingredient cost data for an Australian panini bar's inventory system before a client demo.\n" +
      "A bulk import stored many PACK prices as PER-UNIT costs (e.g. an 8x1L almond milk case at $28.21 saved as $28.21 per litre; the truth is 8 L per pack, ~$3.53/L).\n\n" +
      "For each ingredient below, return:\n" +
      "- unit: the sensible base stock unit (kg/g/L/mL/each). Keep the current unit when it is already sensible, and NEVER change a LOCKED unit.\n" +
      '- unitsPerPack + packUnit: the physical contents of ONE invoiced pack, read from the invoice wording ("1lt x 8pk" = 8 L; "12 x 355ml" = 4260 mL or 12 each — prefer the measure matching your chosen unit; "5kg" = 5 kg).\n' +
      "- costPerUnitCents: pack price ÷ contents converted into your chosen unit, in cents, rounded integer. When no pack exists, estimate a realistic 2026 AU wholesale figure.\n\n" +
      "Sanity-check every cost against real Australian wholesale prices (eggs ≈ $0.30-0.60 each; milk ≈ $1.50-4/L; cheese ≈ $8-30/kg; deli meat ≈ $10-40/kg; produce ≈ $2-15/kg; packaging ≈ cents each). If your derived number is wildly off those, re-read the pack wording.\n" +
      "Return one item per ingredient, every ingredientId exactly as given.\n\n" +
      "Ingredients:\n" +
      lines.join("\n");

    let object: { items: Array<{ ingredientId: string; unit: string; costPerUnitCents: number; unitsPerPack: number; packUnit: string }> } | null = null;
    for (let attempt = 0; attempt < 2 && !object; attempt += 1) {
      try {
        const result = await generateObject({
          model: anthropic("claude-haiku-4-5"),
          schema: fixSchema,
          temperature: attempt === 0 ? 0.1 : 0.3,
          providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
          messages: [{ role: "user", content: prompt }],
        });
        object = result.object;
      } catch (error) {
        console.warn(`[demo-fix] batch ${Math.floor(start / BATCH_SIZE) + 1} attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (!object) {
      console.warn(`[demo-fix] batch ${Math.floor(start / BATCH_SIZE) + 1} skipped after retries`);
      continue;
    }

    for (const item of object.items) {
      if (!batch.some((t) => t.ingredientId === item.ingredientId)) continue;
      const unit = normaliseUnit(item.unit);
      const packUnit = normaliseUnit(item.packUnit) ?? unit;
      const cost = Math.round(Number(item.costPerUnitCents));
      const perPack = Number(item.unitsPerPack);
      if (!unit || !packUnit || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(perPack) || perPack <= 0) {
        console.warn(`[demo-fix] rejected line for ${item.ingredientId}: unit=${item.unit} cost=${item.costPerUnitCents} perPack=${item.unitsPerPack}`);
        continue;
      }
      updates.set(item.ingredientId, { unit, costPerUnitCents: cost, unitsPerPack: perPack, packUnit });
    }
    console.info(`[demo-fix] LLM batch ${Math.floor(start / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)} done (${updates.size} corrections so far)`);
  }

  // ---- 4. Apply ----------------------------------------------------------
  let ingredientUpdates = 0;
  let productUpdates = 0;
  const samples: string[] = [];

  for (const target of targets) {
    const fix = updates.get(target.ingredientId);
    if (!fix) continue;
    const unit = target.unitLocked ? (target.currentUnit as FixUnit) : fix.unit;

    if (samples.length < 12) {
      samples.push(
        `${target.name}: $${(target.currentCostCents / 100).toFixed(2)}/${target.currentUnit} -> $${(fix.costPerUnitCents / 100).toFixed(2)}/${unit}`,
      );
    }

    if (!DRY_RUN) {
      await db
        .update(schema.ingredients)
        .set({
          unit,
          costPerUnitCents: fix.costPerUnitCents,
          bestSupplierCostCents: fix.costPerUnitCents,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.ingredients.id, target.ingredientId));
      ingredientUpdates += 1;

      if (target.product) {
        await db
          .update(schema.supplierProducts)
          .set({
            unitsPerPack: String(fix.unitsPerPack),
            packUnit: fix.packUnit,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.supplierProducts.id, target.product.id));
        productUpdates += 1;
      }
    }
  }
  console.info(`[demo-fix] applied: ${ingredientUpdates} ingredients, ${productUpdates} supplier products`);
  console.info(samples.map((s) => `  ${s}`).join("\n"));

  // ---- 5. Recompute recipe + menu item costs ----------------------------
  if (!DRY_RUN) {
    const venueRecipes = await db
      .select({ id: schema.recipes.id, serves: schema.recipes.serves })
      .from(schema.recipes)
      .where(eq(schema.recipes.venueId, venueId));

    for (const recipe of venueRecipes) {
      const lines = await db
        .select({
          id: schema.recipeIngredients.id,
          ingredientId: schema.recipeIngredients.ingredientId,
          quantity: schema.recipeIngredients.quantity,
          unitCostCents: schema.recipeIngredients.unitCostCents,
        })
        .from(schema.recipeIngredients)
        .where(eq(schema.recipeIngredients.recipeId, recipe.id));

      let totalCents = 0;
      for (const line of lines) {
        let unitCost = line.unitCostCents;
        if (line.ingredientId && updates.has(line.ingredientId)) {
          unitCost = updates.get(line.ingredientId)!.costPerUnitCents;
          await db
            .update(schema.recipeIngredients)
            .set({ unitCostCents: unitCost, updatedAt: new Date().toISOString() })
            .where(eq(schema.recipeIngredients.id, line.id));
        }
        totalCents += Number(line.quantity) * unitCost;
      }
      const costPerServe = Math.round(totalCents / Math.max(1, recipe.serves));
      await db
        .update(schema.recipes)
        .set({ costPerServeCents: costPerServe, updatedAt: new Date().toISOString() })
        .where(eq(schema.recipes.id, recipe.id));

      const mappings = await db
        .select({ menuItemId: schema.menuItemRecipes.menuItemId, quantity: schema.menuItemRecipes.quantity })
        .from(schema.menuItemRecipes)
        .where(eq(schema.menuItemRecipes.recipeId, recipe.id));
      for (const mapping of mappings) {
        const menuRows = await db
          .select({ priceCents: schema.menuItems.priceCents })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.id, mapping.menuItemId));
        const price = menuRows[0]?.priceCents ?? 0;
        const menuCost = Math.round(costPerServe * Number(mapping.quantity));
        const gp = price > 0 ? Math.round(((price - menuCost) / price) * 100) : 0;
        await db
          .update(schema.menuItems)
          .set({
            costPerServeCents: menuCost,
            gpPercent: gp,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.menuItems.id, mapping.menuItemId));
      }
      console.info(`[demo-fix] recipe recomputed: ${recipe.id} -> $${(costPerServe / 100).toFixed(2)}/serve`);
    }
  }

  console.info("[demo-fix] done");
  process.exit(0);
}

main().catch((error) => {
  console.error("[demo-fix] FAILED", error);
  process.exit(1);
});
