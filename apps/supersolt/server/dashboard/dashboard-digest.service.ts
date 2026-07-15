import { createHash } from "node:crypto";

import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import { consumptionRepo } from "@/server/consumption/consumption.repo";
import { stockOnHandService } from "@/server/consumption/stock-on-hand.service";
import { dashboardDigestRepo } from "@/server/dashboard/dashboard-digest.repo";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import {
  isSchoolHoliday,
  publicHolidayName,
  resolveCalendarRegion,
} from "@/server/calendar/au-calendar";

export class DashboardDigestServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DIGEST_MODEL = "claude-haiku-4-5";
const DIGEST_MAX_TOKENS = 450;
/** The tabbed morning digest writes 2-4 sections, so it gets more headroom. */
const TABBED_DIGEST_MAX_TOKENS = 700;
const STOCK_RISK_DAYS_OF_COVER = 3;

function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export type DashboardStockRiskItem = {
  ingredientId: string;
  name: string;
  unit: string;
  stockOnHand: number;
  avgDailyUse: number;
  daysOfCover: number;
};

export type DashboardInsightTiles = {
  cogs: {
    costCents7d: number;
    revenueCents7d: number;
    /** null when there's no revenue to divide by */
    percent: number | null;
    /** prior 7-day window, for the delta */
    prevPercent: number | null;
  };
  stockRisk: {
    /** null = no stock-count anchor yet, tile should prompt a baseline count */
    trackedIngredients: number | null;
    atRisk: DashboardStockRiskItem[];
  };
  unmappedSales: {
    count7d: number;
    valueCents7d: number;
    /** Daily untracked-sales dollars over the trailing week, oldest first. */
    byDay: Array<{ date: string; valueCents: number }>;
  };
  /** Daily theoretical consumption cost, oldest first (last 14 days ending yesterday). */
  costByDay: Array<{ date: string; costCents: number }>;
};

export type InventoryCogsRange = {
  costCents: number;
  revenueCents: number;
  /** null when there's no revenue to divide by */
  percent: number | null;
  /** prior window of equal length, for the delta */
  prevPercent: number | null;
  /** Daily theoretical consumption cost inside the range, oldest first. */
  costByDay: Array<{ date: string; costCents: number }>;
};

async function gatherGrounding(
  ctx: RequestAuthContext,
  scope: { organisationId: string; venueId: string; venueName: string; timezone: string },
) {
  const today = formatShiftDateInVenue(new Date().toISOString(), scope.timezone);
  const yesterday = shiftDate(today, -1);
  const weekAgo = shiftDate(today, -7);

  // Known-in-advance calendar signals for the next week (public holidays + school-term break).
  const regionInfo = await forecastRepo.getVenueRegionInfo(ctx.appDb, scope.venueId);
  const region = resolveCalendarRegion(regionInfo?.state, regionInfo?.country);
  const upcomingHolidays: Array<{ date: string; name: string }> = [];
  let schoolHolidayToday = false;
  if (region) {
    for (let i = 0; i <= 7; i += 1) {
      const d = shiftDate(today, i);
      const name = publicHolidayName(region, d);
      if (name) {
        upcomingHolidays.push({ date: d, name });
      }
    }
    schoolHolidayToday = isSchoolHoliday(region, today);
  }

  const [sales, forecastRows, costByDay, exceptions, invoices, pos, square] =
    await Promise.all([
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.listDailySales(tx, {
          venueId: scope.venueId,
          fromDate: shiftDate(today, -15),
          toDate: today,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.listRevenueForecasts(tx, {
          venueId: scope.venueId,
          fromDate: yesterday,
          toDate: today,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.consumptionCostByDay(tx, {
          venueId: scope.venueId,
          fromDate: shiftDate(today, -14),
          toDate: yesterday,
        }),
      ),
      ctx.appDb.rls((tx) =>
        consumptionRepo.listExceptionsInRange(tx, {
          venueId: scope.venueId,
          fromDate: weekAgo,
          toDate: today,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.pendingInvoiceStats(tx, scope.venueId),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.openPoStats(tx, { venueId: scope.venueId, today }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.squareConnectionHealth(tx, scope.venueId),
      ),
    ]);

  const [sohRows, demandRates] = await Promise.all([
    stockOnHandService.computeForVenue(ctx.appDb, scope.venueId),
    ctx.appDb.rls((tx) =>
      consumptionRepo.demandRates(tx, {
        venueId: scope.venueId,
        endDateExclusive: today,
      }),
    ),
  ]);

  const rateByIngredient = new Map(demandRates.map((r) => [r.ingredientId, r]));
  const anchored = sohRows.filter((r) => r.stockOnHand !== null);
  const atRisk: DashboardStockRiskItem[] = anchored
    .flatMap((row) => {
      const rate = rateByIngredient.get(row.ingredientId);
      const avgDaily = rate && rate.qty14 > 0 ? rate.avgDaily14 : rate?.avgDaily28 ?? 0;
      if (avgDaily <= 0) return [];
      const daysOfCover = Math.max(0, (row.stockOnHand as number) / avgDaily);
      if (daysOfCover >= STOCK_RISK_DAYS_OF_COVER) return [];
      return [
        {
          ingredientId: row.ingredientId,
          name: row.name,
          unit: row.unit,
          stockOnHand: row.stockOnHand as number,
          avgDailyUse: avgDaily,
          daysOfCover,
        },
      ];
    })
    .sort((a, b) => a.daysOfCover - b.daysOfCover)
    .slice(0, 8);

  const unmapped = exceptions.filter((e) => e.kind === "unmapped_sale");
  const prevWeekStart = shiftDate(today, -14);
  const revenue7d = sales
    .filter((s) => s.date >= weekAgo && s.date <= yesterday)
    .reduce((sum, s) => sum + s.revenueCents, 0);
  const revenuePrev7d = sales
    .filter((s) => s.date >= prevWeekStart && s.date < weekAgo)
    .reduce((sum, s) => sum + s.revenueCents, 0);
  const cost7d = costByDay
    .filter((c) => c.date >= weekAgo)
    .reduce((sum, c) => sum + c.costCents, 0);
  const costPrev7d = costByDay
    .filter((c) => c.date < weekAgo)
    .reduce((sum, c) => sum + c.costCents, 0);

  const tiles: DashboardInsightTiles = {
    cogs: {
      costCents7d: cost7d,
      revenueCents7d: revenue7d,
      percent: revenue7d > 0 ? (cost7d / revenue7d) * 100 : null,
      prevPercent: revenuePrev7d > 0 ? (costPrev7d / revenuePrev7d) * 100 : null,
    },
    stockRisk: {
      trackedIngredients: anchored.length > 0 ? anchored.length : null,
      atRisk,
    },
    unmappedSales: {
      count7d: unmapped.reduce((sum, e) => sum + Number(e.qty ?? 0), 0),
      valueCents7d: unmapped.reduce((sum, e) => sum + Number(e.valueCents ?? 0), 0),
      byDay: [...unmapped
        .reduce((acc, e) => {
          acc.set(e.date, (acc.get(e.date) ?? 0) + Number(e.valueCents ?? 0));
          return acc;
        }, new Map<string, number>())
        .entries()]
        .map(([date, valueCents]) => ({ date, valueCents }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
    costByDay: costByDay.map((c) => ({ date: c.date, costCents: c.costCents })),
  };

  return {
    today,
    yesterday,
    sales,
    forecastRows,
    costByDay,
    tiles,
    invoices,
    pos,
    square,
    upcomingHolidays,
    schoolHolidayToday,
  };
}

/**
 * Coarse fingerprint of the digest grounding. The cached digest is frozen
 * until this hash changes: the venue day rolls over (today is in the key) or
 * the data moves materially. Live intraday figures are bucketed so every
 * individual sale doesn't invalidate the cache.
 */
function digestGroundingFingerprint(
  grounding: Awaited<ReturnType<typeof gatherGrounding>>,
): string {
  const { tiles } = grounding;
  const todayRow = grounding.sales.find((s) => s.date === grounding.today);
  const halfPoint = (n: number) => Math.round(n * 2) / 2;
  const key = {
    today: grounding.today,
    closedSales: grounding.sales
      .filter((s) => s.date !== grounding.today)
      .map((s) => `${s.date}:${s.revenueCents}:${s.ordersCount}`),
    todayRevenueBucket: todayRow
      ? Math.round(todayRow.revenueCents / 50_000)
      : null,
    todayOrdersBucket: todayRow ? Math.round(todayRow.ordersCount / 25) : null,
    forecasts: grounding.forecastRows.map(
      (f) => `${f.date}:${Math.round(f.forecastValue)}`,
    ),
    cogsPercent:
      tiles.cogs.percent !== null ? halfPoint(tiles.cogs.percent) : null,
    stockRisks: tiles.stockRisk.atRisk.map(
      (r) => `${r.ingredientId}:${halfPoint(r.daysOfCover)}`,
    ),
    anchored: tiles.stockRisk.trackedIngredients !== null,
    unmappedCountBucket: Math.round(tiles.unmappedSales.count7d / 10),
    unmappedValueBucket: Math.round(tiles.unmappedSales.valueCents7d / 25_000),
    invoices: grounding.invoices,
    pos: grounding.pos,
    squareConnected: grounding.square.connected,
    holidays: grounding.upcomingHolidays.map((h) => `${h.date}:${h.name}`),
    schoolHolidayToday: grounding.schoolHolidayToday,
    promptVersion: DASHBOARD_DIGEST_PROMPT_VERSION,
  };
  return createHash("sha256").update(JSON.stringify(key)).digest("hex");
}

function cachedDigestResponse(digest: string): Response {
  return new Response(digest, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-digest-cache": "hit",
    },
  });
}

/** Bump when the digest output format changes so cached digests re-generate. */
const DASHBOARD_DIGEST_PROMPT_VERSION = 3;

const DIGEST_SYSTEM_PROMPT = `You are Superbot, writing the morning digest on a hospitality operator's dashboard. You get one venue's data as JSON: recent daily sales, yesterday's revenue forecast, theoretical COGS from real ingredient consumption, low-stock risks (days of cover), whether stock-on-hand is anchored by a stock count, unmapped sales (sales not yet traced to a recipe), pending invoices, open or overdue purchase orders, upcoming public holidays, and Square connection health.

Write the digest as 2 to 4 tabbed sections. Start each section with a marker line "@@TAB Title" (Title is 1-2 plain words, no punctuation), then that section's body on the following lines.

The first tab is always "Today": 2 to 4 short sentences on how yesterday closed (versus forecast when available) and the single most important thing to watch today. If a public holiday falls today or within the next few days (see upcomingPublicHolidays), call it out by name and day and note trade and the forecast are less predictable around holidays. Only mention schoolHolidayToday if it genuinely affects the day. Choose the remaining tabs yourself from where the data has real signal, e.g. "Sales" for momentum and patterns across recent days, "Stock" for ingredients at risk or unmapped sales worth mapping, "Ordering" for invoices waiting and open or overdue purchase orders. Aim for 3 tabs when the data supports them; skip any topic with nothing genuinely noteworthy, and never pad.

Each tab body: 1-3 short sentences of analysis, optionally followed by action lines. Every concrete next step goes in an action line, never in the prose. Each action line is formatted EXACTLY as "- @slug a short imperative sentence", placed in the tab it belongs to. Use ONLY these slugs, and only when the condition holds:
- @map-unmapped-sales   when there are unmapped sales worth tracing to recipes.
- @start-stock-count    when stock-on-hand is NOT yet anchored by a count.
- @build-order          when items are low on days of cover or an order is due.
- @reconcile-invoices   when invoices are pending.
- @chase-supplier       when purchase orders are open or overdue.
- @log-waste            when there is clear shrinkage or waste to record.
- @reconnect-square     when the Square connection is disconnected or unhealthy.

Rules: at most 3 action lines across the whole digest, most important first. Emit an action ONLY when the data genuinely supports it; when everything is healthy, emit no action lines at all. Never invent a slug or an action the data does not support. Each action sentence is one short line, starts with a verb, and cites the real number where it helps. Warm, direct, numerate voice; round dollars sensibly; keep each tab under 55 words. No headings, no markdown besides the dash action lines. Never use the em dash character anywhere; use commas or full stops instead.`;

const INVENTORY_DIGEST_SYSTEM_PROMPT = `You are Superbot, writing the analyst briefing at the top of a hospitality operator's inventory insights page. You get one venue's data as JSON: theoretical COGS from real ingredient consumption (7-day cost, revenue and percent, plus the prior week), a daily consumption-cost series, low-stock risks with days of cover, whether stock-on-hand is anchored by a stock count, unmapped sales (sales not yet traced to a recipe), pending invoices and open purchase orders.

Write 2-3 short sentences reading the venue's inventory position like a sharp operations analyst: lead with where COGS sits and which way it moved, then the most pressing stock risk. The prose is analysis only; every concrete next step goes in a bullet, never in the prose. After the prose, emit one or two action bullets for the most pressing moves. Each bullet is its own line "- @key text" where key names the page the operator opens to act on it, chosen from exactly: inventory_order_guide (order or reorder stock), inventory_invoices (pending invoices to reconcile), inventory_stock_counts (run or approve a stock count), inventory_waste (log or review waste), inventory_suppliers (chase a supplier or delivery), catalog_items (map unmapped POS sales to recipes). Example: "- @inventory_stock_counts Run a baseline count to anchor cover tracking." Round dollars sensibly. Never invent data that isn't in the JSON; if a section is empty, don't mention it. No headings, no markdown besides the dash bullets, under 110 words. Do not use em dashes.`;

export const dashboardDigestService = {
  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async getInsightTiles(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<DashboardInsightTiles> {
    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (m) => new DashboardDigestServiceError(404, m),
        forbidden: () => new DashboardDigestServiceError(403, "Forbidden"),
      },
    );
    const { tiles } = await gatherGrounding(ctx, scope);
    return tiles;
  },

  async getInventoryCogsRange(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<InventoryCogsRange> {
    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (m) => new DashboardDigestServiceError(404, m),
        forbidden: () => new DashboardDigestServiceError(403, "Forbidden"),
      },
    );

    const rangeDays =
      differenceInCalendarDays(parseISO(args.toDate), parseISO(args.fromDate)) +
      1;
    const prevFrom = shiftDate(args.fromDate, -rangeDays);
    const prevTo = shiftDate(args.fromDate, -1);

    const [costByDay, prevCostByDay, sales, prevSales] = await Promise.all([
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.consumptionCostByDay(tx, {
          venueId: scope.venueId,
          fromDate: args.fromDate,
          toDate: args.toDate,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.consumptionCostByDay(tx, {
          venueId: scope.venueId,
          fromDate: prevFrom,
          toDate: prevTo,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.listDailySales(tx, {
          venueId: scope.venueId,
          fromDate: args.fromDate,
          toDate: args.toDate,
        }),
      ),
      ctx.appDb.rls((tx) =>
        dashboardDigestRepo.listDailySales(tx, {
          venueId: scope.venueId,
          fromDate: prevFrom,
          toDate: prevTo,
        }),
      ),
    ]);

    const costCents = costByDay.reduce((sum, c) => sum + c.costCents, 0);
    const revenueCents = sales.reduce((sum, s) => sum + s.revenueCents, 0);
    const prevCostCents = prevCostByDay.reduce(
      (sum, c) => sum + c.costCents,
      0,
    );
    const prevRevenueCents = prevSales.reduce(
      (sum, s) => sum + s.revenueCents,
      0,
    );

    return {
      costCents,
      revenueCents,
      percent: revenueCents > 0 ? (costCents / revenueCents) * 100 : null,
      prevPercent:
        prevRevenueCents > 0 ? (prevCostCents / prevRevenueCents) * 100 : null,
      costByDay: [...costByDay].sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  async streamDigest(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; force?: boolean },
  ): Promise<Response> {
    if (!this.isAvailable()) {
      throw new DashboardDigestServiceError(
        503,
        "AI digest is not configured (missing ANTHROPIC_API_KEY)",
      );
    }

    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (m) => new DashboardDigestServiceError(404, m),
        forbidden: () => new DashboardDigestServiceError(403, "Forbidden"),
      },
    );

    const grounding = await gatherGrounding(ctx, scope);
    const fingerprint = digestGroundingFingerprint(grounding);

    if (!args.force) {
      try {
        const cached = await dashboardDigestRepo.getCachedDigest(ctx.appDb, {
          venueId: scope.venueId,
          kind: "dashboard",
        });
        if (cached && cached.groundingHash === fingerprint) {
          return cachedDigestResponse(cached.digest);
        }
      } catch {
        // Cache table may not exist yet (pending migration); generate fresh.
      }
    }

    const payload = {
      venue: scope.venueName,
      today: grounding.today,
      dailySales: grounding.sales.map((s) => ({
        date: s.date,
        revenue: `$${(s.revenueCents / 100).toFixed(0)}`,
        orders: s.ordersCount,
      })),
      yesterdayForecast: grounding.forecastRows
        .filter((f) => f.date === grounding.yesterday)
        .map((f) => `$${(f.forecastValue / 100).toFixed(0)}`)[0] ?? null,
      theoreticalCogs7d: `$${(grounding.tiles.cogs.costCents7d / 100).toFixed(0)}`,
      cogsPercent7d:
        grounding.tiles.cogs.percent !== null
          ? `${grounding.tiles.cogs.percent.toFixed(1)}%`
          : null,
      stockRisks: grounding.tiles.stockRisk.atRisk.map((r) => ({
        ingredient: r.name,
        daysOfCover: Number(r.daysOfCover.toFixed(1)),
      })),
      stockCountAnchored: grounding.tiles.stockRisk.trackedIngredients !== null,
      unmappedSales7d: {
        count: grounding.tiles.unmappedSales.count7d,
        value: `$${(grounding.tiles.unmappedSales.valueCents7d / 100).toFixed(0)}`,
      },
      pendingInvoices: grounding.invoices,
      purchaseOrders: grounding.pos,
      squareConnection: grounding.square,
      upcomingPublicHolidays: grounding.upcomingHolidays.map((h) => ({
        date: h.date,
        day: format(parseISO(h.date), "EEEE"),
        name: h.name,
        isToday: h.date === grounding.today,
      })),
      schoolHolidayToday: grounding.schoolHolidayToday,
    };

    const result = streamText({
      model: anthropic(DIGEST_MODEL),
      system: DIGEST_SYSTEM_PROMPT,
      prompt: JSON.stringify(payload, null, 1),
      maxOutputTokens: TABBED_DIGEST_MAX_TOKENS,
      onFinish: async ({ text }) => {
        try {
          await dashboardDigestRepo.upsertCachedDigest(ctx.appDb, {
            venueId: scope.venueId,
            kind: "dashboard",
            digest: text,
            groundingHash: fingerprint,
          });
        } catch {
          // Best-effort cache write; next load just regenerates.
        }
      },
    });

    return result.toTextStreamResponse();
  },

  async streamInventoryDigest(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<Response> {
    if (!this.isAvailable()) {
      throw new DashboardDigestServiceError(
        503,
        "AI digest is not configured (missing ANTHROPIC_API_KEY)",
      );
    }

    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (m) => new DashboardDigestServiceError(404, m),
        forbidden: () => new DashboardDigestServiceError(403, "Forbidden"),
      },
    );

    const grounding = await gatherGrounding(ctx, scope);
    const { tiles } = grounding;

    const payload = {
      venue: scope.venueName,
      today: grounding.today,
      cogs7d: {
        cost: `$${(tiles.cogs.costCents7d / 100).toFixed(0)}`,
        revenue: `$${(tiles.cogs.revenueCents7d / 100).toFixed(0)}`,
        percent:
          tiles.cogs.percent !== null
            ? `${tiles.cogs.percent.toFixed(1)}%`
            : null,
        prevWeekPercent:
          tiles.cogs.prevPercent !== null
            ? `${tiles.cogs.prevPercent.toFixed(1)}%`
            : null,
      },
      dailyConsumptionCost: tiles.costByDay.map((c) => ({
        date: c.date,
        cost: `$${(c.costCents / 100).toFixed(0)}`,
      })),
      stockCountAnchored: tiles.stockRisk.trackedIngredients !== null,
      trackedIngredients: tiles.stockRisk.trackedIngredients,
      stockRisks: tiles.stockRisk.atRisk.map((r) => ({
        ingredient: r.name,
        stockOnHand: `${Number(r.stockOnHand.toFixed(2))} ${r.unit}`,
        avgDailyUse: `${Number(r.avgDailyUse.toFixed(2))} ${r.unit}/day`,
        daysOfCover: Number(r.daysOfCover.toFixed(1)),
      })),
      unmappedSales7d: {
        count: tiles.unmappedSales.count7d,
        value: `$${(tiles.unmappedSales.valueCents7d / 100).toFixed(0)}`,
      },
      pendingInvoices: grounding.invoices,
      purchaseOrders: grounding.pos,
    };

    const result = streamText({
      model: anthropic(DIGEST_MODEL),
      system: INVENTORY_DIGEST_SYSTEM_PROMPT,
      prompt: JSON.stringify(payload, null, 1),
      maxOutputTokens: DIGEST_MAX_TOKENS,
    });

    return result.toTextStreamResponse();
  },
};
