import { addDays, format, parseISO } from "date-fns";

import type { AppDb } from "@/server/db/create-app-db";
import type { RequestAuthContext } from "@/server/auth/context";
import {
  formatShiftDateInVenue,
  venueCalendarDayBoundsUtc,
} from "@/lib/roster/venue-time";
import {
  buildMenuItemBoms,
  dedupeExceptions,
  type ExplosionException,
  type ExplosionGraph,
} from "@/server/consumption/explosion";
import {
  consumptionRepo,
  type DailyFactRow,
  type ExceptionRow,
  type OrderLineRow,
  type RecipeGraphRows,
} from "@/server/consumption/consumption.repo";
import { ConsumptionServiceError } from "@/server/consumption/consumption-errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { stockOnHandService } from "@/server/consumption/stock-on-hand.service";

const REFRESH_DEBOUNCE_MS = 120_000;
const NIGHTLY_BACKFILL_DAYS = 7;

type DayComputation = {
  facts: DailyFactRow[];
  exceptions: ExceptionRow[];
};

function buildGraph(rows: RecipeGraphRows): {
  graph: ExplosionGraph;
  costByIngredient: Map<string, number>;
} {
  const linesByRecipe = new Map<string, RecipeGraphRows["recipeLines"]>();
  for (const line of rows.recipeLines) {
    const list = linesByRecipe.get(line.recipeId) ?? [];
    list.push(line);
    linesByRecipe.set(line.recipeId, list);
  }
  const recipeMetaById = new Map(rows.recipeMeta.map((r) => [r.id, r]));
  const ingredientUnitById = new Map(
    rows.ingredients.map((i) => [i.id, i.unit]),
  );
  const costByIngredient = new Map(
    rows.ingredients.map((i) => [i.id, i.costPerUnitCents]),
  );
  return {
    graph: { linesByRecipe, recipeMetaById, ingredientUnitById },
    costByIngredient,
  };
}

/**
 * Pure per-day aggregation: sales lines x exploded BOM -> daily facts +
 * exceptions. Quantity drives consumption, not price: comps and $0 sales
 * consume; refunds never reverse (order lines carry no refund state).
 */
export function computeDayAggregation(args: {
  venueId: string;
  organisationId: string;
  date: string;
  orderLines: OrderLineRow[];
  graphRows: RecipeGraphRows;
}): DayComputation {
  const { graph, costByIngredient } = buildGraph(args.graphRows);
  const { bomByMenuItem, exceptions: explosionExceptions } = buildMenuItemBoms({
    links: args.graphRows.menuItemLinks,
    graph,
  });

  type Agg = { qty: number; salesLines: number; recipeHits: number };
  const byIngredient = new Map<string, Agg>();
  type UnmappedAgg = {
    qty: number;
    valueCents: number;
    lineName: string | null;
    squareCatalogObjectId: string | null;
    menuItemId: string | null;
  };
  const unmapped = new Map<string, UnmappedAgg>();
  const hitMenuItems = new Set<string>();

  for (const line of args.orderLines) {
    const soldQty = Number(line.quantity);
    if (!Number.isFinite(soldQty) || soldQty <= 0) continue;

    const bom = line.menuItemId ? bomByMenuItem.get(line.menuItemId) : undefined;
    const isUnmapped =
      !line.menuItemId || line.matchSource === "unmapped" || bom === undefined;

    if (isUnmapped) {
      const key = line.squareCatalogObjectId ?? line.lineName ?? "unknown";
      const prev = unmapped.get(key) ?? {
        qty: 0,
        valueCents: 0,
        lineName: line.lineName,
        squareCatalogObjectId: line.squareCatalogObjectId,
        menuItemId: line.menuItemId,
      };
      prev.qty += soldQty;
      prev.valueCents += line.grossAmountCents;
      unmapped.set(key, prev);
      continue;
    }

    hitMenuItems.add(line.menuItemId as string);
    for (const [ingredientId, qtyPerUnit] of bom) {
      const prev = byIngredient.get(ingredientId) ?? {
        qty: 0,
        salesLines: 0,
        recipeHits: 0,
      };
      prev.qty += soldQty * qtyPerUnit;
      prev.salesLines += 1;
      prev.recipeHits += 1;
      byIngredient.set(ingredientId, prev);
    }
  }

  const facts: DailyFactRow[] = [];
  for (const [ingredientId, agg] of byIngredient) {
    const costPerUnitCents = costByIngredient.get(ingredientId) ?? 0;
    facts.push({
      venueId: args.venueId,
      ingredientId,
      date: args.date,
      qtyConsumedBaseUnits: agg.qty,
      costCents: Math.round(agg.qty * costPerUnitCents),
      sourceRecipeCount: agg.recipeHits,
      sourceSalesCount: agg.salesLines,
    });
  }

  const exceptions: ExceptionRow[] = [];
  for (const u of unmapped.values()) {
    exceptions.push({
      organisationId: args.organisationId,
      venueId: args.venueId,
      date: args.date,
      kind: "unmapped_sale",
      menuItemId: u.menuItemId,
      recipeId: null,
      ingredientId: null,
      detail: {
        lineName: u.lineName,
        squareCatalogObjectId: u.squareCatalogObjectId,
      },
      qty: u.qty,
      valueCents: u.valueCents,
    });
  }

  // Recipe-structure exceptions only matter for the day if the menu item
  // (or a recipe) actually sold or is referenced; keep menu-item-scoped
  // ones to items that sold, keep recipe-scoped ones always (broken
  // recipes are worth surfacing regardless of the day's sales).
  const relevant: ExplosionException[] = dedupeExceptions(
    explosionExceptions,
  ).filter((e) => !e.menuItemId || hitMenuItems.has(e.menuItemId));

  for (const e of relevant) {
    exceptions.push({
      organisationId: args.organisationId,
      venueId: args.venueId,
      date: args.date,
      kind: e.kind,
      menuItemId: e.menuItemId,
      recipeId: e.recipeId,
      ingredientId: e.ingredientId,
      detail: e.detail,
      qty: null,
      valueCents: null,
    });
  }

  return { facts, exceptions };
}

async function computeAndStoreDay(
  appDb: AppDb,
  args: {
    venueId: string;
    organisationId: string;
    timezone: string;
    date: string;
    finalize: boolean;
  },
): Promise<{ facts: number; exceptions: number }> {
  const { dayStartUtc, dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(
    args.date,
    args.timezone,
  );

  const [graphRows, orderLines] = await Promise.all([
    consumptionRepo.loadRecipeGraph(appDb, args.venueId),
    consumptionRepo.listOrderLinesInRange(appDb, {
      venueId: args.venueId,
      startIso: dayStartUtc.toISOString(),
      endIso: dayEndExclusiveUtc.toISOString(),
    }),
  ]);

  const { facts, exceptions } = computeDayAggregation({
    venueId: args.venueId,
    organisationId: args.organisationId,
    date: args.date,
    orderLines,
    graphRows,
  });

  const factCount = await consumptionRepo.replaceDayFacts(appDb, {
    venueId: args.venueId,
    date: args.date,
    isFinal: args.finalize,
    rows: facts,
  });
  const exceptionCount = await consumptionRepo.replaceDayExceptions(appDb, {
    venueId: args.venueId,
    date: args.date,
    rows: exceptions,
  });

  return { facts: factCount, exceptions: exceptionCount };
}

function venueToday(timezone: string): string {
  return formatShiftDateInVenue(new Date().toISOString(), timezone);
}

function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export const consumptionService = {
  /**
   * Write one closed venue-day's immutable facts. No-op if the day is
   * already final — recipe edits apply forward only.
   */
  async finalizeDay(
    appDb: AppDb,
    args: {
      venueId: string;
      organisationId: string;
      timezone: string;
      date: string;
    },
  ): Promise<{ skipped: boolean; facts: number; exceptions: number }> {
    const today = venueToday(args.timezone);
    if (args.date >= today) {
      throw new ConsumptionServiceError(
        "consumption.failed",
        `Cannot finalize ${args.date} — the venue day is not closed yet`,
      );
    }
    const alreadyFinal = await consumptionRepo.hasFinalRowsForDate(appDb, {
      venueId: args.venueId,
      date: args.date,
    });
    if (alreadyFinal) {
      return { skipped: true, facts: 0, exceptions: 0 };
    }
    const result = await computeAndStoreDay(appDb, { ...args, finalize: true });
    return { skipped: false, ...result };
  },

  /** Recompute "today so far" as volatile (non-final) rows. */
  async refreshToday(
    appDb: AppDb,
    args: {
      venueId: string;
      organisationId: string;
      timezone: string;
      force?: boolean;
    },
  ): Promise<{ skipped: boolean; facts: number; exceptions: number }> {
    const today = venueToday(args.timezone);
    if (!args.force) {
      const latest = await consumptionRepo.latestComputedAtForDate(appDb, {
        venueId: args.venueId,
        date: today,
      });
      if (latest && Date.now() - new Date(latest).getTime() < REFRESH_DEBOUNCE_MS) {
        return { skipped: true, facts: 0, exceptions: 0 };
      }
    }
    const result = await computeAndStoreDay(appDb, {
      venueId: args.venueId,
      organisationId: args.organisationId,
      timezone: args.timezone,
      date: today,
      finalize: false,
    });
    return { skipped: false, ...result };
  },

  /**
   * Fill closed days that were never finalized (missed cron runs). Each
   * missing day is computed once with current recipes, then final.
   */
  async backfillVenue(
    appDb: AppDb,
    args: {
      venueId: string;
      organisationId: string;
      timezone: string;
      lookbackDays?: number;
    },
  ): Promise<{ daysComputed: number }> {
    const lookback = args.lookbackDays ?? NIGHTLY_BACKFILL_DAYS;
    const today = venueToday(args.timezone);
    const yesterday = shiftDate(today, -1);
    const fromDate = shiftDate(today, -lookback);

    const finalDates = await consumptionRepo.listFinalDatesInRange(appDb, {
      venueId: args.venueId,
      fromDate,
      toDate: yesterday,
    });

    let daysComputed = 0;
    for (let d = fromDate; d <= yesterday; d = shiftDate(d, 1)) {
      if (finalDates.has(d)) continue;
      await computeAndStoreDay(appDb, {
        venueId: args.venueId,
        organisationId: args.organisationId,
        timezone: args.timezone,
        date: d,
        finalize: true,
      });
      daysComputed += 1;
    }
    return { daysComputed };
  },

  /** Nightly cron entry point: finalize yesterday + backfill + SOH cache. */
  async runNightly(appDb: AppDb): Promise<{
    venuesProcessed: number;
    daysComputed: number;
    stockLevelsUpdated: number;
  }> {
    const venues = await consumptionRepo.listActiveVenues(appDb);
    let daysComputed = 0;
    let stockLevelsUpdated = 0;

    for (const venue of venues) {
      const { daysComputed: computed } = await this.backfillVenue(appDb, {
        venueId: venue.venueId,
        organisationId: venue.organisationId,
        timezone: venue.timezone,
      });
      daysComputed += computed;
      stockLevelsUpdated += await stockOnHandService.updateCacheForVenue(
        appDb,
        venue.venueId,
      );
    }

    return { venuesProcessed: venues.length, daysComputed, stockLevelsUpdated };
  },

  /**
   * Compatibility path for callers that previously recomputed a window
   * (stock count submit). Honours immutability: closed days are computed
   * only if never finalized; today is refreshed live.
   */
  async refreshWindow(
    appDb: AppDb,
    args: {
      venueId: string;
      timezone: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<number> {
    const venues = await consumptionRepo.listActiveVenues(appDb);
    const venue = venues.find((v) => v.venueId === args.venueId);
    if (!venue) return 0;

    const today = venueToday(args.timezone);
    const lookbackDays = Math.min(
      90,
      Math.max(
        1,
        Math.round(
          (parseISO(today).getTime() - parseISO(args.fromDate).getTime()) /
            86_400_000,
        ),
      ),
    );

    const { daysComputed } = await this.backfillVenue(appDb, {
      venueId: venue.venueId,
      organisationId: venue.organisationId,
      timezone: args.timezone,
      lookbackDays,
    });

    let refreshed = 0;
    if (args.toDate >= today) {
      const result = await this.refreshToday(appDb, {
        venueId: venue.venueId,
        organisationId: venue.organisationId,
        timezone: args.timezone,
        force: true,
      });
      refreshed = result.facts;
    }
    return daysComputed + refreshed;
  },

  // --- request-scoped reads -------------------------------------------------

  async getExceptions(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      fromDate: string;
      toDate: string;
    },
  ) {
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

    const rows = await ctx.appDb.rls((tx) =>
      consumptionRepo.listExceptionsInRange(tx, {
        venueId: scope.venueId,
        fromDate: args.fromDate,
        toDate: args.toDate,
      }),
    );

    const unmappedValueCents = rows
      .filter((r) => r.kind === "unmapped_sale")
      .reduce((sum, r) => sum + Number(r.valueCents ?? 0), 0);

    return {
      exceptions: rows.map((r) => ({
        id: r.id,
        date: r.date,
        kind: r.kind,
        menuItemId: r.menuItemId,
        recipeId: r.recipeId,
        ingredientId: r.ingredientId,
        detail: r.detail as Record<string, unknown>,
        qty: r.qty !== null ? Number(r.qty) : null,
        valueCents: r.valueCents !== null ? Number(r.valueCents) : null,
        computedAt: r.computedAt,
      })),
      summary: {
        total: rows.length,
        unmappedSales: rows.filter((r) => r.kind === "unmapped_sale").length,
        unmappedValueCents,
      },
    };
  },

  async getDemandRates(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
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

    const today = venueToday(scope.timezone);
    const rates = await ctx.appDb.rls((tx) =>
      consumptionRepo.demandRates(tx, {
        venueId: scope.venueId,
        endDateExclusive: today,
      }),
    );
    return { rates, windowEndExclusive: today };
  },

  async refreshTodayForVenue(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
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

    const result = await this.refreshToday(ctx.appDb, {
      venueId: scope.venueId,
      organisationId: scope.organisationId,
      timezone: scope.timezone,
      force: true,
    });
    const stockLevelsUpdated = await stockOnHandService.updateCacheForVenue(
      ctx.appDb,
      scope.venueId,
    );
    return { ...result, stockLevelsUpdated };
  },
};
