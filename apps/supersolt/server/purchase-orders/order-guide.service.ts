import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  orderGuideRepo,
  type SupplierProductWithSupplier,
} from "./order-guide.repo";
import {
  computeSuggestion,
  sumForecastRevenueCents,
  type OrderGuideSuggestion,
} from "./order-guide.compute";
import { PurchaseOrdersServiceError } from "./purchase-orders.service";

export type OrderGuidePeriodPreset = "3d" | "7d" | "14d" | "custom";

export type OrderGuideResponse = {
  computedAt: string | null;
  forecastReady: boolean;
  forecastHorizonDays: number;
  periodPreset: OrderGuidePeriodPreset;
  coldStart: boolean;
  stockCountMissing: boolean;
  noSupplierProducts: boolean;
  suggestionsBySupplier: Array<{
    supplierId: string;
    supplierName: string;
    orderingEmail: string | null;
    leadTimeDays: number;
    minimumOrderCents: number;
    subtotalCents: number;
    belowMinimum: boolean;
    minimumShortfallCents: number;
    lines: OrderGuideSuggestion[];
  }>;
  meta: {
    defaultBufferPercent: number;
    revenueForecastCents: number;
  };
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function horizonDays(preset: OrderGuidePeriodPreset, leadTimeDays: number): number {
  switch (preset) {
    case "3d":
      return 3;
    case "7d":
      return 7;
    case "14d":
      return 14;
    default:
      return leadTimeDays + 1;
  }
}

export const orderGuideService = {
  async get(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      periodPreset?: OrderGuidePeriodPreset;
      forceRefresh?: boolean;
    },
  ): Promise<OrderGuideResponse> {
    const context = await resolveVenueScopeForService(ctx, args.organisationSlug, args.venueSlug, {
      notFound: () => new PurchaseOrdersServiceError(404, "Venue not found"),
      forbidden: () => new PurchaseOrdersServiceError(403, "Forbidden"),
    });

    const periodPreset = args.periodPreset ?? "7d";

    if (!args.forceRefresh) {
      const cache = await ctx.appDb.rls((tx) =>
        orderGuideRepo.getCache(tx, context.venueId),
      );

      if (cache?.suggestions && cache.periodPreset === periodPreset) {
        const computedAt = cache.computedAt;
        const ageMs = Date.now() - new Date(computedAt).getTime();
        if (ageMs < 4 * 60 * 60 * 1000) {
          const meta = (cache.meta as OrderGuideResponse["meta"]) ?? {
            defaultBufferPercent: 15,
            revenueForecastCents: 0,
          };
          const cacheMeta = cache.meta as {
            forecastReady?: boolean;
            coldStart?: boolean;
            stockCountMissing?: boolean;
            noSupplierProducts?: boolean;
          };
          return {
            computedAt,
            forecastReady: Boolean(cacheMeta?.forecastReady),
            forecastHorizonDays: cache.forecastHorizonDays,
            periodPreset: cache.periodPreset as OrderGuidePeriodPreset,
            coldStart: Boolean(cacheMeta?.coldStart),
            stockCountMissing: Boolean(cacheMeta?.stockCountMissing),
            noSupplierProducts: Boolean(cacheMeta?.noSupplierProducts),
            suggestionsBySupplier:
              cache.suggestions as OrderGuideResponse["suggestionsBySupplier"],
            meta,
          };
        }
      }
    }

    return this.computeAndCache(ctx, {
      context,
      periodPreset,
    });
  },

  async computeAndCache(
    ctx: RequestAuthContext,
    args: {
      context: {
        organisationId: string;
        venueId: string;
        venueName: string;
        organisationName: string;
      };
      periodPreset: OrderGuidePeriodPreset;
    },
  ): Promise<OrderGuideResponse> {
    const forecastState = await ctx.appDb.rls((tx) =>
      orderGuideRepo.getForecastState(tx, args.context.venueId),
    );

    const forecastReady = forecastState?.forecastReady ?? false;
    const coldStart =
      !forecastReady || (forecastState?.availableHistoryDays ?? 0) < 14;

    const orgBuffer = await ctx.appDb.rls((tx) =>
      orderGuideRepo.getDefaultBufferPercent(tx, args.context.organisationId),
    );

    const defaultBufferPercent = Number(orgBuffer ?? 15);

    const today = new Date().toISOString().slice(0, 10);
    const horizon = horizonDays(args.periodPreset, 3);
    const toDate = addDays(today, horizon);

    let revenueForecastCents = 0;
    if (!coldStart) {
      const forecastRows = await ctx.appDb.rls((tx) =>
        orderGuideRepo.listForecastsInRange(
          tx,
          args.context.venueId,
          today,
          toDate,
        ),
      );

      revenueForecastCents = sumForecastRevenueCents(
        forecastRows.map((f) => ({
          date: f.date,
          metric: f.metric,
          forecastValue: Number(f.forecastValue),
        })),
        today,
        toDate,
      );
    }

    const products = await ctx.appDb.rls((tx) =>
      orderGuideRepo.listActiveSupplierProducts(
        tx,
        args.context.organisationId,
        args.context.venueId,
      ),
    );

    const noSupplierProducts = products.length === 0;

    const ingredientRows = await ctx.appDb.rls((tx) =>
      orderGuideRepo.listVenueIngredients(tx, args.context.venueId),
    );

    const ingredientMap = new Map(ingredientRows.map((i) => [i.id, i]));

    const buffers = await ctx.appDb.rls((tx) =>
      orderGuideRepo.listIngredientBuffers(tx, args.context.venueId),
    );

    const bufferMap = new Map(
      buffers.map((b) => [
        b.ingredientId,
        {
          bufferPercent: Number(b.bufferPercent),
          exclude: b.excludeFromOrderGuide,
        },
      ]),
    );

    const openPoIds = await ctx.appDb.rls((tx) =>
      orderGuideRepo.listOpenPurchaseOrderIds(tx, args.context.venueId),
    );
    const pendingByIngredient = new Map<string, number>();

    if (openPoIds.length > 0) {
      const openLines = await ctx.appDb.rls((tx) =>
        orderGuideRepo.listOpenPoLines(tx, openPoIds),
      );

      for (const line of openLines) {
        const ingId = line.ingredientId;
        if (!ingId) continue;
        const pending = Math.max(
          0,
          Number(line.quantityOrdered) - Number(line.quantityReceived),
        );
        const product = products.find((p) => p.id === line.supplierProductId);
        const unitsPerPack = Number(product?.unitsPerPack ?? 1);
        pendingByIngredient.set(
          ingId,
          (pendingByIngredient.get(ingId) ?? 0) + pending * unitsPerPack,
        );
      }
    }

    const recipeIds = await ctx.appDb.rls((tx) =>
      orderGuideRepo.listPublishedRecipeIds(tx, args.context.venueId),
    );

    const recipeIngredientRows =
      recipeIds.length > 0
        ? await ctx.appDb.rls((tx) =>
            orderGuideRepo.listRecipeIngredients(tx, recipeIds),
          )
        : [];

    const demandPerIngredient = new Map<string, number>();
    const recipeCount = Math.max(1, recipeIngredientRows.length);
    const revenuePerRecipe = coldStart ? 0 : revenueForecastCents / recipeCount;

    for (const ri of recipeIngredientRows) {
      if (!ri.ingredientId) continue;
      const qty = Number(ri.quantity);
      demandPerIngredient.set(
        ri.ingredientId,
        (demandPerIngredient.get(ri.ingredientId) ?? 0) +
          (revenuePerRecipe / 100) * qty * 0.01,
      );
    }

    const bySupplier = new Map<
      string,
      OrderGuideResponse["suggestionsBySupplier"][number]
    >();

    for (const product of products) {
      const ingId = product.ingredientId;
      if (!ingId) continue;
      const ing = ingredientMap.get(ingId);
      if (!ing) continue;

      const bufferEntry = bufferMap.get(ingId);
      if (bufferEntry?.exclude) continue;

      const supplier = product.supplier;

      const bufferPercent = bufferEntry?.bufferPercent ?? defaultBufferPercent;
      const demand = demandPerIngredient.get(ingId) ?? 0;
      const stock = Number(ing.currentStockLevel ?? 0);

      const suggestion = computeSuggestion({
        ingredientId: ingId,
        ingredientName: ing.name,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierProductId: product.id,
        supplierProductName: product.name,
        unitPriceCents: product.unitPriceCents,
        unitsPerPack: Number(product.unitsPerPack),
        packLabel: product.packLabel,
        packUnit: product.packUnit,
        baseUnit: ing.unit,
        forecastedDemandBaseUnits: demand,
        currentStockBaseUnits: stock,
        pendingDeliveriesBaseUnits: pendingByIngredient.get(ingId) ?? 0,
        bufferPercent,
        minimumOrderCents: supplier.minimumOrderCents ?? 0,
        supplierSubtotalCents: bySupplier.get(supplier.id)?.subtotalCents ?? 0,
      });

      if (!suggestion) continue;

      const existing = bySupplier.get(supplier.id);
      if (existing) {
        existing.lines.push(suggestion);
        existing.subtotalCents += suggestion.suggestedSubtotalCents;
        existing.belowMinimum =
          supplier.minimumOrderCents > 0 &&
          existing.subtotalCents < supplier.minimumOrderCents;
        existing.minimumShortfallCents = existing.belowMinimum
          ? supplier.minimumOrderCents - existing.subtotalCents
          : 0;
      } else {
        bySupplier.set(supplier.id, {
          supplierId: supplier.id,
          supplierName: supplier.name,
          orderingEmail: supplier.orderingEmail ?? supplier.email,
          leadTimeDays: supplier.leadTimeDays ?? 3,
          minimumOrderCents: supplier.minimumOrderCents ?? 0,
          subtotalCents: suggestion.suggestedSubtotalCents,
          belowMinimum:
            (supplier.minimumOrderCents ?? 0) > 0 &&
            suggestion.suggestedSubtotalCents <
              (supplier.minimumOrderCents ?? 0),
          minimumShortfallCents: 0,
          lines: [suggestion],
        });
      }
    }

    const suggestionsBySupplier = [...bySupplier.values()];
    const stockCountMissing =
      ingredientRows.length > 0 &&
      ingredientRows.every((i) => Number(i.currentStockLevel) === 0);

    const response: OrderGuideResponse = {
      computedAt: new Date().toISOString(),
      forecastReady,
      forecastHorizonDays: horizon,
      periodPreset: args.periodPreset,
      coldStart,
      stockCountMissing,
      noSupplierProducts,
      suggestionsBySupplier,
      meta: {
        defaultBufferPercent,
        revenueForecastCents,
      },
    };

    await ctx.appDb.rls((tx) =>
      orderGuideRepo.upsertCache(tx, {
        venueId: args.context.venueId,
        computedAt: response.computedAt ?? new Date().toISOString(),
        forecastHorizonDays: horizon,
        periodPreset: args.periodPreset,
        suggestions: suggestionsBySupplier,
        meta: {
          forecastReady,
          coldStart,
          stockCountMissing,
          noSupplierProducts,
          defaultBufferPercent,
          revenueForecastCents,
        },
      }),
    );

    return response;
  },

  async createDraftPosFromSelections(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      selections: Array<{
        supplierId: string;
        lines: Array<{
          supplierProductId: string;
          ingredientId: string;
          productName: string;
          quantityPacks: number;
          unitPriceCents: number;
        }>;
      }>;
    }
  ): Promise<{ poIds: string[] }> {
    const { purchaseOrdersService } = await import("./purchase-orders.service");
    const poIds: string[] = [];

    for (const group of args.selections) {
      if (group.lines.length === 0) continue;
      const detail = await purchaseOrdersService.create(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        input: {
          supplierId: group.supplierId,
          lines: group.lines.map((line) => ({
            supplierProductId: line.supplierProductId,
            ingredientId: line.ingredientId,
            productName: line.productName,
            quantityOrdered: line.quantityPacks,
            unitPriceCents: line.unitPriceCents,
          })),
        },
      });
      poIds.push(detail.id);
    }

    return { poIds };
  },
};
