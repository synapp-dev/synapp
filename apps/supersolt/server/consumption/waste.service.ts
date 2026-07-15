import type { RequestAuthContext } from "@/server/auth/context";
import { convertQty, isCountUnit } from "@/server/consumption/units";
import { explodeRecipeToRaw } from "@/server/consumption/explosion";
import { consumptionRepo } from "@/server/consumption/consumption.repo";
import { wasteRepo, type WasteEntryInsert } from "@/server/consumption/waste.repo";
import { ConsumptionServiceError } from "@/server/consumption/consumption-errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { stockOnHandService } from "@/server/consumption/stock-on-hand.service";
import { isWasteReason } from "@/lib/waste/reasons";

export type CreateWasteEntryInput = {
  ingredientId?: string | null;
  recipeId?: string | null;
  qty: number;
  unit: string;
  reason: string;
  note?: string | null;
  occurredAt?: string | null;
};

type VenueScope = { organisationId: string; venueId: string };

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (m) => new ConsumptionServiceError("waste.not_found", m),
    forbidden: () => new ConsumptionServiceError("waste.forbidden", "Forbidden"),
  });
}

function displayName(row: {
  createdByFullName: string | null;
  createdByFirstName: string | null;
  createdByLastName: string | null;
  createdByEmail: string | null;
}): string | null {
  if (row.createdByFullName) return row.createdByFullName;
  const joined = [row.createdByFirstName, row.createdByLastName]
    .filter(Boolean)
    .join(" ");
  return joined || row.createdByEmail;
}

/**
 * Validate and insert one waste entry (ingredient or batch). Scope is
 * resolved by the caller so bulk logging resolves once and refreshes the
 * stock-on-hand cache once.
 */
async function insertEntry(
  ctx: RequestAuthContext,
  scope: VenueScope,
  input: CreateWasteEntryInput,
): Promise<{ id: string }> {
  if (!isWasteReason(input.reason)) {
    throw new ConsumptionServiceError(
      "waste.invalid_input",
      `Unknown reason "${input.reason}"`,
    );
  }
  if (!Number.isFinite(input.qty) || input.qty === 0) {
    throw new ConsumptionServiceError("waste.invalid_input", "qty must be a non-zero number");
  }
  if (input.qty < 0 && input.reason !== "correction") {
    throw new ConsumptionServiceError(
      "waste.invalid_input",
      'Negative qty requires reason "correction"',
    );
  }
  const hasIngredient = Boolean(input.ingredientId);
  const hasRecipe = Boolean(input.recipeId);
  if (hasIngredient === hasRecipe) {
    throw new ConsumptionServiceError(
      "waste.invalid_input",
      "Provide exactly one of ingredientId or recipeId",
    );
  }

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const note = input.note?.trim() || null;

  const base: Omit<
    WasteEntryInsert,
    "ingredientId" | "recipeId" | "qty" | "unit" | "qtyBaseUnits" | "costCents" | "source"
  > = {
    organisationId: scope.organisationId,
    venueId: scope.venueId,
    reason: input.reason,
    note,
    occurredAt,
    createdBy: ctx.userId,
  };

  if (hasIngredient) {
    const [ingredient] = await consumptionRepo.listIngredientsByIds(
      ctx.appDb,
      [input.ingredientId as string],
    );
    if (!ingredient) {
      throw new ConsumptionServiceError("waste.not_found", "Ingredient not found");
    }
    const qtyBaseUnits = convertQty(input.qty, input.unit, ingredient.unit);
    if (qtyBaseUnits === null) {
      throw new ConsumptionServiceError(
        "waste.unit_conversion",
        `Cannot convert ${input.unit} to ${ingredient.unit} for ${ingredient.name}`,
      );
    }
    return ctx.appDb.rls((tx) =>
      wasteRepo.insertEntryWithChildren(tx, {
        parent: {
          ...base,
          ingredientId: ingredient.id,
          recipeId: null,
          qty: input.qty,
          unit: input.unit,
          qtyBaseUnits,
          costCents: Math.round(qtyBaseUnits * ingredient.costPerUnitCents),
          source: "manual",
        },
        children: [],
      }),
    );
  }

  // Batch waste: explode to raws via the recipe formula.
  if (!isCountUnit(input.unit)) {
    throw new ConsumptionServiceError(
      "waste.unit_conversion",
      "Batch waste must be recorded in serves/each — batches have no mass/volume yield",
    );
  }

  const graphRows = await consumptionRepo.loadRecipeGraph(ctx.appDb, scope.venueId);
  const recipeMetaById = new Map(graphRows.recipeMeta.map((r) => [r.id, r]));
  const recipeMeta = recipeMetaById.get(input.recipeId as string);
  if (!recipeMeta) {
    throw new ConsumptionServiceError("waste.not_found", "Recipe not found");
  }

  const linesByRecipe = new Map<string, typeof graphRows.recipeLines>();
  for (const line of graphRows.recipeLines) {
    const list = linesByRecipe.get(line.recipeId) ?? [];
    list.push(line);
    linesByRecipe.set(line.recipeId, list);
  }
  const ingredientUnitById = new Map(graphRows.ingredients.map((i) => [i.id, i.unit]));
  const costByIngredient = new Map(
    graphRows.ingredients.map((i) => [i.id, i.costPerUnitCents]),
  );
  const nameByIngredient = new Map(graphRows.ingredients.map((i) => [i.id, i.name]));

  // Explode one serve of the batch, then scale by serves wasted.
  const servesWasted = input.qty;
  const { raws, exceptions } = explodeRecipeToRaw({
    recipeId: recipeMeta.id,
    multiplier: servesWasted / Math.max(1, recipeMeta.serves),
    graph: { linesByRecipe, recipeMetaById, ingredientUnitById },
  });

  if (raws.size === 0) {
    throw new ConsumptionServiceError(
      "waste.invalid_input",
      exceptions.length > 0
        ? `Recipe "${recipeMeta.name}" could not be exploded to raw ingredients`
        : `Recipe "${recipeMeta.name}" has no raw ingredient lines`,
    );
  }

  const children: WasteEntryInsert[] = [];
  let totalCostCents = 0;
  for (const [ingredientId, qtyBaseUnits] of raws) {
    const costCents = Math.round(
      qtyBaseUnits * (costByIngredient.get(ingredientId) ?? 0),
    );
    totalCostCents += costCents;
    children.push({
      ...base,
      ingredientId,
      recipeId: null,
      qty: qtyBaseUnits,
      unit: ingredientUnitById.get(ingredientId) ?? "each",
      qtyBaseUnits,
      costCents,
      source: "batch_explosion",
      note: nameByIngredient.get(ingredientId)
        ? `from batch: ${recipeMeta.name}`
        : null,
    });
  }

  return ctx.appDb.rls((tx) =>
    wasteRepo.insertEntryWithChildren(tx, {
      parent: {
        ...base,
        ingredientId: null,
        recipeId: recipeMeta.id,
        qty: servesWasted,
        unit: input.unit,
        qtyBaseUnits: null,
        costCents: totalCostCents,
        source: "manual",
      },
      children,
    }),
  );
}

export const wasteService = {
  /**
   * Record waste. Ingredient entries convert to the ingredient's base
   * unit and cost at the current unit cost. Batch (recipe) entries
   * explode through the recipe's formula to per-ingredient child rows —
   * the same explosion the consumption engine uses — so stock on hand
   * depletes raws, never the batch. Negative qty is allowed only with
   * reason "correction" (returns stock to shelf).
   */
  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: CreateWasteEntryInput;
    },
  ): Promise<{ id: string }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const result = await insertEntry(ctx, scope, args.input);
    await stockOnHandService.updateCacheForVenue(ctx.appDb, scope.venueId);
    return result;
  },

  /**
   * Bulk log: the end-of-day "3 croissants + 2 muffins" flow. All lines
   * share one timestamp; validation failures reject the whole batch
   * before anything is written.
   */
  async createBulk(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      entries: CreateWasteEntryInput[];
    },
  ): Promise<{ ids: string[] }> {
    if (args.entries.length === 0) {
      throw new ConsumptionServiceError("waste.invalid_input", "No entries provided");
    }
    if (args.entries.length > 50) {
      throw new ConsumptionServiceError(
        "waste.invalid_input",
        "Bulk log is capped at 50 lines",
      );
    }
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const sharedOccurredAt = new Date().toISOString();

    const ids: string[] = [];
    for (const entry of args.entries) {
      const result = await insertEntry(ctx, scope, {
        ...entry,
        occurredAt: entry.occurredAt ?? sharedOccurredAt,
      });
      ids.push(result.id);
    }
    await stockOnHandService.updateCacheForVenue(ctx.appDb, scope.venueId);
    return { ids };
  },

  async remove(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; entryId: string },
  ): Promise<{ deleted: true }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const entry = await ctx.appDb.rls((tx) =>
      wasteRepo.getEntry(tx, { id: args.entryId, venueId: scope.venueId }),
    );
    if (!entry) {
      throw new ConsumptionServiceError("waste.not_found", "Waste entry not found");
    }
    if (entry.parentEntryId) {
      throw new ConsumptionServiceError(
        "waste.invalid_input",
        "Batch explosion lines cannot be deleted directly; delete the parent entry",
      );
    }
    const deleted = await ctx.appDb.rls((tx) =>
      wasteRepo.deleteEntry(tx, { id: args.entryId, venueId: scope.venueId }),
    );
    if (deleted === 0) {
      throw new ConsumptionServiceError("waste.not_found", "Waste entry not found");
    }
    await stockOnHandService.updateCacheForVenue(ctx.appDb, scope.venueId);
    return { deleted: true };
  },

  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      fromIso: string;
      toIso: string;
    },
  ) {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const rows = await ctx.appDb.rls((tx) =>
      wasteRepo.listEntries(tx, {
        venueId: scope.venueId,
        fromIso: args.fromIso,
        toIso: args.toIso,
      }),
    );
    return {
      entries: rows.map((r) => ({
        id: r.id,
        ingredientId: r.ingredientId,
        recipeId: r.recipeId,
        itemName: r.ingredientName ?? r.recipeName ?? "Unknown item",
        isBatch: r.recipeId !== null,
        qty: Number(r.qty),
        unit: r.unit,
        qtyBaseUnits: r.qtyBaseUnits !== null ? Number(r.qtyBaseUnits) : null,
        costCents: Number(r.costCents),
        reason: r.reason,
        note: r.note,
        source: r.source,
        occurredAt: r.occurredAt,
        createdAt: r.createdAt,
        loggedBy: displayName(r),
      })),
    };
  },
};

export type WasteEntryDto = Awaited<
  ReturnType<typeof wasteService.list>
>["entries"][number];
