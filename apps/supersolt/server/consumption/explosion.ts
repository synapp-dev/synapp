import { convertQty, isCountUnit } from "@/server/consumption/units";

export type RecipeMeta = { id: string; name: string; serves: number };

export type RecipeLine = {
  recipeId: string;
  ingredientId: string | null;
  ingredientName: string;
  quantity: number;
  unit: string;
  isSubRecipe: boolean;
  subRecipeId: string | null;
};

export type MenuItemRecipeLink = {
  menuItemId: string;
  recipeId: string;
  quantity: number;
};

export type ExplosionExceptionKind =
  | "empty_recipe"
  | "unit_conversion_failure"
  | "recipe_cycle";

export type ExplosionException = {
  kind: ExplosionExceptionKind;
  menuItemId: string | null;
  recipeId: string | null;
  ingredientId: string | null;
  detail: Record<string, unknown>;
};

export type ExplosionGraph = {
  linesByRecipe: Map<string, RecipeLine[]>;
  recipeMetaById: Map<string, RecipeMeta>;
  ingredientUnitById: Map<string, string>;
};

const MAX_DEPTH = 10;

/**
 * Explode one recipe to raw-ingredient quantities (in each ingredient's
 * base unit) per `multiplier` units of the recipe. Batches (sub-recipe
 * lines) resolve recursively through their formula: a sub-recipe line's
 * quantity is read as "serves of the batch used", so each batch line is
 * scaled by quantity / batch.serves. Batch quantities expressed in
 * mass/volume units are not resolvable without a yield and surface as
 * unit_conversion_failure.
 */
export function explodeRecipeToRaw(args: {
  recipeId: string;
  multiplier: number;
  graph: ExplosionGraph;
  path?: string[];
}): { raws: Map<string, number>; exceptions: ExplosionException[] } {
  const raws = new Map<string, number>();
  const exceptions: ExplosionException[] = [];
  const path = args.path ?? [];

  const meta = args.graph.recipeMetaById.get(args.recipeId);
  if (!meta) {
    exceptions.push({
      kind: "empty_recipe",
      menuItemId: null,
      recipeId: args.recipeId,
      ingredientId: null,
      detail: { reason: "recipe_not_found" },
    });
    return { raws, exceptions };
  }

  if (path.includes(args.recipeId) || path.length >= MAX_DEPTH) {
    exceptions.push({
      kind: "recipe_cycle",
      menuItemId: null,
      recipeId: args.recipeId,
      ingredientId: null,
      detail: { reason: path.includes(args.recipeId) ? "cycle" : "max_depth", path: [...path, args.recipeId] },
    });
    return { raws, exceptions };
  }

  const lines = args.graph.linesByRecipe.get(args.recipeId) ?? [];

  for (const line of lines) {
    if (line.isSubRecipe && line.subRecipeId) {
      const subMeta = args.graph.recipeMetaById.get(line.subRecipeId);
      if (!subMeta) {
        exceptions.push({
          kind: "empty_recipe",
          menuItemId: null,
          recipeId: line.subRecipeId,
          ingredientId: null,
          detail: { reason: "sub_recipe_not_found", parentRecipe: meta.name },
        });
        continue;
      }
      if (!isCountUnit(line.unit)) {
        exceptions.push({
          kind: "unit_conversion_failure",
          menuItemId: null,
          recipeId: args.recipeId,
          ingredientId: null,
          detail: {
            reason: "batch_quantity_not_in_serves",
            subRecipe: subMeta.name,
            unit: line.unit,
          },
        });
        continue;
      }
      const servesUsed = line.quantity;
      if (!Number.isFinite(servesUsed) || servesUsed <= 0) continue;
      const subMultiplier =
        (args.multiplier * servesUsed) / Math.max(1, subMeta.serves);
      const sub = explodeRecipeToRaw({
        recipeId: line.subRecipeId,
        multiplier: subMultiplier,
        graph: args.graph,
        path: [...path, args.recipeId],
      });
      for (const [ingredientId, qty] of sub.raws) {
        raws.set(ingredientId, (raws.get(ingredientId) ?? 0) + qty);
      }
      exceptions.push(...sub.exceptions);
      continue;
    }

    if (!line.ingredientId) {
      exceptions.push({
        kind: "empty_recipe",
        menuItemId: null,
        recipeId: args.recipeId,
        ingredientId: null,
        detail: {
          reason: "unlinked_ingredient_line",
          ingredientName: line.ingredientName,
          recipe: meta.name,
        },
      });
      continue;
    }

    const baseUnit = args.graph.ingredientUnitById.get(line.ingredientId);
    if (baseUnit === undefined) {
      exceptions.push({
        kind: "unit_conversion_failure",
        menuItemId: null,
        recipeId: args.recipeId,
        ingredientId: line.ingredientId,
        detail: {
          reason: "ingredient_not_found",
          ingredientName: line.ingredientName,
          recipe: meta.name,
        },
      });
      continue;
    }

    const converted = convertQty(line.quantity, line.unit, baseUnit);
    if (converted === null) {
      exceptions.push({
        kind: "unit_conversion_failure",
        menuItemId: null,
        recipeId: args.recipeId,
        ingredientId: line.ingredientId,
        detail: {
          reason: "unconvertible_units",
          ingredientName: line.ingredientName,
          recipe: meta.name,
          fromUnit: line.unit,
          toUnit: baseUnit,
        },
      });
      continue;
    }

    if (!Number.isFinite(converted) || converted <= 0) continue;
    raws.set(
      line.ingredientId,
      (raws.get(line.ingredientId) ?? 0) + args.multiplier * converted,
    );
  }

  return { raws, exceptions };
}

export type MenuItemBom = Map<string, Map<string, number>>;

/**
 * Build the per-menu-item BOM (menuItemId -> ingredientId -> qty per one
 * sold unit). Top-level recipe lines keep the existing engine convention:
 * they are per-sold-unit quantities scaled by the menu-item-recipe link
 * quantity, with no division by the top recipe's serves.
 */
export function buildMenuItemBoms(args: {
  links: MenuItemRecipeLink[];
  graph: ExplosionGraph;
}): { bomByMenuItem: MenuItemBom; exceptions: ExplosionException[] } {
  const bomByMenuItem: MenuItemBom = new Map();
  const exceptions: ExplosionException[] = [];
  const linksByMenuItem = new Map<string, MenuItemRecipeLink[]>();

  for (const link of args.links) {
    const list = linksByMenuItem.get(link.menuItemId) ?? [];
    list.push(link);
    linksByMenuItem.set(link.menuItemId, list);
  }

  for (const [menuItemId, links] of linksByMenuItem) {
    const raws = new Map<string, number>();
    for (const link of links) {
      if (!Number.isFinite(link.quantity) || link.quantity <= 0) continue;
      const result = explodeRecipeToRaw({
        recipeId: link.recipeId,
        multiplier: link.quantity,
        graph: args.graph,
      });
      for (const [ingredientId, qty] of result.raws) {
        raws.set(ingredientId, (raws.get(ingredientId) ?? 0) + qty);
      }
      exceptions.push(
        ...result.exceptions.map((e) => ({ ...e, menuItemId })),
      );
    }
    if (raws.size === 0 && links.length > 0) {
      exceptions.push({
        kind: "empty_recipe",
        menuItemId,
        recipeId: links[0]?.recipeId ?? null,
        ingredientId: null,
        detail: { reason: "no_raw_lines" },
      });
    }
    bomByMenuItem.set(menuItemId, raws);
  }

  return { bomByMenuItem, exceptions: dedupeExceptions(exceptions) };
}

export function dedupeExceptions(
  exceptions: ExplosionException[],
): ExplosionException[] {
  const seen = new Set<string>();
  const out: ExplosionException[] = [];
  for (const e of exceptions) {
    const key = JSON.stringify([
      e.kind,
      e.menuItemId,
      e.recipeId,
      e.ingredientId,
      e.detail,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
