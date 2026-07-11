import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { addDays, format, parseISO } from "date-fns";

import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import { consumptionRepo } from "@/server/consumption/consumption.repo";
import { stockOnHandService } from "@/server/consumption/stock-on-hand.service";
import { dashboardDigestRepo } from "@/server/dashboard/dashboard-digest.repo";

export class DashboardDigestServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DIGEST_MODEL = "claude-haiku-4-5";
const DIGEST_MAX_TOKENS = 450;
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
  };
};

async function gatherGrounding(
  ctx: RequestAuthContext,
  scope: { organisationId: string; venueId: string; venueName: string; timezone: string },
) {
  const today = formatShiftDateInVenue(new Date().toISOString(), scope.timezone);
  const yesterday = shiftDate(today, -1);
  const weekAgo = shiftDate(today, -7);

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
    },
  };

  return { today, yesterday, sales, forecastRows, costByDay, tiles, invoices, pos, square };
}

const DIGEST_SYSTEM_PROMPT = `You are Superbot, writing the morning digest on a hospitality operator's dashboard. You get one venue's data as JSON: recent daily sales, yesterday's revenue forecast, theoretical COGS from real ingredient consumption, low-stock risks (days of cover), unmapped sales (sales not yet traced to a recipe), pending invoices, open purchase orders, and Square connection health.

Write 2-4 short sentences that frame the operator's day, in a warm, direct, numerate voice. Lead with how yesterday closed (vs forecast if available), then the single most important thing to look at today. Then, only if genuinely noteworthy, add up to two one-line bullets (start each with "- ") for concrete actions: an ingredient about to run out, invoices waiting, an overdue delivery, a chunk of unmapped sales worth mapping. Round dollars sensibly. Never invent data that isn't in the JSON; if a section is empty, don't mention it. No headings, no markdown besides the dash bullets, under 120 words. Do not use em dashes.`;

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

  async streamDigest(
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
    };

    const result = streamText({
      model: anthropic(DIGEST_MODEL),
      system: DIGEST_SYSTEM_PROMPT,
      prompt: JSON.stringify(payload, null, 1),
      maxOutputTokens: DIGEST_MAX_TOKENS,
    });

    return result.toTextStreamResponse();
  },
};
