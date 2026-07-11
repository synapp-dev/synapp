import type { AppDb } from "@/server/db/create-app-db";
import type { RequestAuthContext } from "@/server/auth/context";
import { consumptionRepo } from "@/server/consumption/consumption.repo";
import { ConsumptionServiceError } from "@/server/consumption/consumption-errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";

export type StockOnHandRow = {
  ingredientId: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
  anchorQty: number | null;
  anchorAt: string | null;
  receiptsBaseUnits: number;
  consumptionBaseUnits: number;
  wasteBaseUnits: number;
  /** null = no approved count has ever anchored this ingredient */
  stockOnHand: number | null;
};

/**
 * stock on hand = last approved count + receipts − consumption − waste.
 * Ingredients with no approved count ever have null SOH ("needs baseline
 * count") — the formula has no anchor to start from.
 */
export const stockOnHandService = {
  async computeForVenue(appDb: AppDb, venueId: string): Promise<StockOnHandRow[]> {
    const [ingredients, anchors] = await Promise.all([
      consumptionRepo.listVenueIngredients(appDb, venueId),
      consumptionRepo.latestApprovedCountEntries(appDb, venueId),
    ]);

    const anchorByIngredient = new Map(
      anchors.map((a) => [a.ingredientId, a]),
    );

    const earliestAnchor = anchors.reduce<string | null>(
      (min, a) => (min === null || a.anchorAt < min ? a.anchorAt : min),
      null,
    );

    if (earliestAnchor === null) {
      return ingredients.map((i) => ({
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        costPerUnitCents: i.costPerUnitCents,
        anchorQty: null,
        anchorAt: null,
        receiptsBaseUnits: 0,
        consumptionBaseUnits: 0,
        wasteBaseUnits: 0,
        stockOnHand: null,
      }));
    }

    const [receipts, consumption, waste] = await Promise.all([
      consumptionRepo.receiptsSince(appDb, { venueId, sinceIso: earliestAnchor }),
      consumptionRepo.consumptionSince(appDb, {
        venueId,
        fromDate: earliestAnchor.slice(0, 10),
      }),
      consumptionRepo.wasteSince(appDb, { venueId, sinceIso: earliestAnchor }),
    ]);

    return ingredients.map((i) => {
      const anchor = anchorByIngredient.get(i.id);
      if (!anchor) {
        return {
          ingredientId: i.id,
          name: i.name,
          unit: i.unit,
          costPerUnitCents: i.costPerUnitCents,
          anchorQty: null,
          anchorAt: null,
          receiptsBaseUnits: 0,
          consumptionBaseUnits: 0,
          wasteBaseUnits: 0,
          stockOnHand: null,
        };
      }

      const anchorDate = anchor.anchorAt.slice(0, 10);
      const receiptsSum = receipts
        .filter((r) => r.ingredientId === i.id && r.receivedAt > anchor.anchorAt)
        .reduce((sum, r) => sum + r.qty, 0);
      // Day-grain overlap: the anchor day's consumption after the count
      // moment can't be split out of the daily fact, so facts from the
      // anchor date onwards all count. Matches the stock-counts module's
      // date-slicing behaviour; the next count re-anchors any drift.
      const consumptionSum = consumption
        .filter((c) => c.ingredientId === i.id && c.date >= anchorDate)
        .reduce((sum, c) => sum + c.qty, 0);
      const wasteSum = waste
        .filter((w) => w.ingredientId === i.id && w.occurredAt > anchor.anchorAt)
        .reduce((sum, w) => sum + w.qtyBaseUnits, 0);

      return {
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        costPerUnitCents: i.costPerUnitCents,
        anchorQty: anchor.countedQty,
        anchorAt: anchor.anchorAt,
        receiptsBaseUnits: receiptsSum,
        consumptionBaseUnits: consumptionSum,
        wasteBaseUnits: wasteSum,
        stockOnHand: anchor.countedQty + receiptsSum - consumptionSum - wasteSum,
      };
    });
  },

  /**
   * Write-through cache: keeps ingredients.current_stock_level aligned
   * with the computed SOH so existing readers (Order Guide) see engine
   * truth. Unanchored ingredients are left untouched.
   */
  async updateCacheForVenue(appDb: AppDb, venueId: string): Promise<number> {
    const rows = await this.computeForVenue(appDb, venueId);
    const updates = rows
      .filter((r) => r.stockOnHand !== null)
      .map((r) => ({ ingredientId: r.ingredientId, level: r.stockOnHand as number }));
    return consumptionRepo.updateIngredientStockLevels(appDb, updates);
  },

  async getForVenue(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<{ rows: StockOnHandRow[] }> {
    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (m) => new ConsumptionServiceError("consumption.not_found", m),
        forbidden: () =>
          new ConsumptionServiceError("consumption.forbidden", "Forbidden"),
      },
    );
    const rows = await this.computeForVenue(ctx.appDb, scope.venueId);
    return { rows };
  },
};
