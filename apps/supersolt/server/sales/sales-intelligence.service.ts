import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { AuthError } from "@/server/auth/errors";
import { loadSquareConnectionForVenue } from "@/server/sales/sales-insights.service";
import {
  salesIntelligenceRepo,
  type DailySalesHistoryRow,
  type HeatmapRow,
  type ItemAggregateRow,
} from "@/server/sales/sales-intelligence.repo";
import {
  fitWeatherMultipliers,
  type WeatherMultipliers,
} from "@/server/weather/weather-multipliers";
import type { WeatherBucket } from "@/server/weather/weather-buckets";
import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";
import type {
  MenuMatrixItem,
  MenuMatrixPayload,
  SalesAttachOpportunity,
  SalesFulfillmentPayload,
  SalesHeatmapPayload,
  SalesIntelligencePayload,
  SalesPairing,
  SalesPairingsPayload,
  SalesRecordItem,
  SalesRecordsPayload,
  SalesWeatherLensPayload,
} from "@/entities/sales-insights/model/intelligence-types";

class SalesIntelligenceAccessError extends AuthError {}

/** Australian GST: gst-inclusive menu prices carry 1/11th tax. */
const GST_INCLUSIVE_DIVISOR = 1.1;

/** Kasavana-Smith popularity rule: popular = at least 70% of the mean units per item. */
const POPULARITY_RULE_FACTOR = 0.7;

const MIN_PAIR_COUNT = 4;
const MIN_PAIR_ITEM_ORDERS = 10;
const MIN_PAIR_LIFT = 1.25;
const MAX_PAIRS = 8;

const MIN_OPPORTUNITY_ITEM_ORDERS = 20;
const MAX_OPPORTUNITIES = 3;

const MAX_RECORDS = 4;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function isoToLocalDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayOfWeekUtc(isoDate: string): number {
  const [y = 0, mo = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay();
}

function formatDollars(cents: number): string {
  const dollars = Math.round(Math.abs(cents) / 100);
  return `$${dollars.toLocaleString("en-AU")}`;
}

function formatShortDate(isoDate: string): string {
  const [y = 0, mo = 1, d = 1] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatHourRange(hour: number): string {
  const label = (h: number) => {
    const normalized = ((h % 24) + 24) % 24;
    const suffix = normalized < 12 ? "am" : "pm";
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display}${suffix}`;
  };
  return `${label(hour)} to ${label(hour + 1)}`;
}

function computeMatrix(
  items: ItemAggregateRow[],
  unmappedRevenueCents: number,
): MenuMatrixPayload | null {
  if (items.length === 0) {
    return null;
  }

  const enriched = items.map((row) => {
    const quantity = Number(row.quantity) || 0;
    const revenueCents = Number(row.revenue_cents) || 0;
    const unitGross = quantity > 0 ? revenueCents / quantity : 0;
    const unitNet =
      row.gst_mode === "inclusive" ? unitGross / GST_INCLUSIVE_DIVISOR : unitGross;
    const cost = Number(row.cost_per_serve_cents) || 0;
    return {
      row,
      quantity,
      revenueCents,
      unitNetPriceCents: unitNet,
      costPerServeCents: cost,
      unitContributionCents: unitNet - cost,
      hasCost: cost > 0,
    };
  });

  const costed = enriched.filter((item) => item.hasCost && item.quantity > 0);
  const needsCosting = enriched.filter((item) => !item.hasCost);

  if (costed.length === 0) {
    return {
      items: [],
      popularityThresholdQty: 0,
      avgContributionCents: 0,
      needsCostingCount: needsCosting.length,
      needsCostingRevenueCents: needsCosting.reduce(
        (sum, item) => sum + item.revenueCents,
        0,
      ),
      unmappedRevenueCents,
    };
  }

  const totalQty = costed.reduce((sum, item) => sum + item.quantity, 0);
  const popularityThresholdQty =
    POPULARITY_RULE_FACTOR * (totalQty / costed.length);
  const avgContributionCents =
    costed.reduce(
      (sum, item) => sum + item.unitContributionCents * item.quantity,
      0,
    ) / totalQty;

  const matrixItems: MenuMatrixItem[] = costed
    .map((item) => {
      const popular = item.quantity >= popularityThresholdQty;
      const profitable = item.unitContributionCents >= avgContributionCents;
      const quadrant = popular
        ? profitable
          ? ("star" as const)
          : ("plowhorse" as const)
        : profitable
          ? ("puzzle" as const)
          : ("dog" as const);
      return {
        menuItemId: item.row.menu_item_id,
        label: item.row.name,
        sectionName: item.row.section_name,
        quantity: Math.round(item.quantity),
        revenueCents: Math.round(item.revenueCents),
        orderCount: Number(item.row.order_count) || 0,
        unitNetPriceCents: Math.round(item.unitNetPriceCents),
        costPerServeCents: Math.round(item.costPerServeCents),
        unitContributionCents: Math.round(item.unitContributionCents),
        marginPercent:
          item.unitNetPriceCents > 0
            ? Math.round(
                (item.unitContributionCents / item.unitNetPriceCents) * 100,
              )
            : 0,
        quadrant,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return {
    items: matrixItems,
    popularityThresholdQty: Math.round(popularityThresholdQty * 10) / 10,
    avgContributionCents: Math.round(avgContributionCents),
    needsCostingCount: needsCosting.length,
    needsCostingRevenueCents: Math.round(
      needsCosting.reduce((sum, item) => sum + item.revenueCents, 0),
    ),
    unmappedRevenueCents: Math.round(unmappedRevenueCents),
  };
}

function computeHeatmap(rows: HeatmapRow[]): SalesHeatmapPayload | null {
  if (rows.length === 0) {
    return null;
  }
  const cells = rows.map((row) => ({
    dow: Number(row.dow),
    hour: Number(row.hour),
    orders: Number(row.orders),
    netCents: Math.round(Number(row.net_cents) || 0),
    days: Number(row.days),
  }));
  const totalNet = cells.reduce((sum, cell) => sum + cell.netCents, 0);
  const peak = cells.reduce(
    (best, cell) => (best === null || cell.netCents > best.netCents ? cell : best),
    null as (typeof cells)[number] | null,
  );
  const recurring = cells.filter((cell) => cell.days >= 2 && cell.orders > 0);
  const quietest = recurring.reduce(
    (worst, cell) =>
      worst === null || cell.netCents / cell.days < worst.netCents / worst.days
        ? cell
        : worst,
    null as (typeof cells)[number] | null,
  );
  return {
    cells,
    peak,
    peakShare: peak && totalNet > 0 ? peak.netCents / totalNet : null,
    quietest,
  };
}

function historyToAggregates(rows: DailySalesHistoryRow[]): DailySalesAggregate[] {
  return rows.map((row) => ({
    date: row.date,
    revenueCents: Number(row.revenue_cents) || 0,
    ordersCount: Number(row.orders_count) || 0,
    avgCheckCents: Number(row.avg_check_cents) || 0,
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: Number(row.dine_in_revenue_cents) || 0,
    pickUpRevenueCents: Number(row.pick_up_revenue_cents) || 0,
    deliveryRevenueCents: Number(row.delivery_revenue_cents) || 0,
  }));
}

function computeRecords(
  history: DailySalesAggregate[],
  startDate: string,
  endDate: string,
): SalesRecordsPayload | null {
  const trading = history.filter(
    (day) => day.ordersCount > 0 && day.revenueCents > 0,
  );
  if (trading.length === 0) {
    return null;
  }
  const sorted = [...trading].sort((a, b) => b.revenueCents - a.revenueCents);
  const best = sorted[0];
  const decileCutoffIndex = Math.max(0, Math.floor(sorted.length * 0.1) - 1);
  const decileCutoff = sorted[decileCutoffIndex]?.revenueCents ?? Infinity;

  const byWeekday = new Map<number, DailySalesAggregate[]>();
  for (const day of trading) {
    const dow = dayOfWeekUtc(day.date);
    const list = byWeekday.get(dow) ?? [];
    list.push(day);
    byWeekday.set(dow, list);
  }

  const periodDays = trading.filter(
    (day) => day.date >= startDate && day.date <= endDate,
  );

  const records: SalesRecordItem[] = [];
  for (const day of periodDays) {
    const dow = dayOfWeekUtc(day.date);
    const weekdaySamples = byWeekday.get(dow) ?? [];
    const weekdayBest = weekdaySamples.reduce(
      (max, sample) => Math.max(max, sample.revenueCents),
      0,
    );
    if (best && day.revenueCents >= best.revenueCents) {
      records.push({
        date: day.date,
        kind: "best_day_ever",
        revenueCents: day.revenueCents,
        label: `${formatShortDate(day.date)} was your best day on record (${formatDollars(day.revenueCents)})`,
      });
    } else if (
      weekdaySamples.length >= 4 &&
      day.revenueCents >= weekdayBest
    ) {
      records.push({
        date: day.date,
        kind: "best_weekday_ever",
        revenueCents: day.revenueCents,
        label: `${formatShortDate(day.date)} was your best ${WEEKDAY_NAMES[dow]} on record (${formatDollars(day.revenueCents)})`,
      });
    } else if (sorted.length >= 30 && day.revenueCents >= decileCutoff) {
      records.push({
        date: day.date,
        kind: "top_decile_day",
        revenueCents: day.revenueCents,
        label: `${formatShortDate(day.date)} landed in your top 10% of days (${formatDollars(day.revenueCents)})`,
      });
    }
  }

  const kindPriority = {
    best_day_ever: 0,
    best_weekday_ever: 1,
    top_decile_day: 2,
  } as const;
  records.sort(
    (a, b) =>
      kindPriority[a.kind] - kindPriority[b.kind] ||
      b.revenueCents - a.revenueCents,
  );

  return {
    records: records.slice(0, MAX_RECORDS),
    allTimeBestDate: best?.date ?? null,
    allTimeBestRevenueCents: best?.revenueCents ?? null,
    historyDays: trading.length,
  };
}

function computeWeatherLens(args: {
  history: DailySalesAggregate[];
  bucketsByDate: Record<string, WeatherBucket>;
  startDate: string;
  endDate: string;
}): SalesWeatherLensPayload {
  const paired = args.history.filter(
    (day) => day.ordersCount > 0 && args.bucketsByDate[day.date] !== undefined,
  );
  const ready = paired.length >= 28;
  const multipliers: WeatherMultipliers = fitWeatherMultipliers({
    history: args.history,
    bucketsByDate: args.bucketsByDate,
  });

  const sampleDays = (bucket: WeatherBucket) =>
    paired.filter((day) => args.bucketsByDate[day.date] === bucket).length;

  const learned = (["light_rain", "heavy_rain"] as const)
    .filter((bucket) => Math.abs(multipliers.revenue[bucket] - 1) >= 0.02)
    .map((bucket) => ({
      bucket,
      revenueMultiplier: Math.round(multipliers.revenue[bucket] * 100) / 100,
      sampleDays: sampleDays(bucket),
    }));

  const periodDays = paired.filter(
    (day) => day.date >= args.startDate && day.date <= args.endDate,
  );
  let periodImpactCents = 0;
  let rainDaysInPeriod = 0;
  for (const day of periodDays) {
    const bucket = args.bucketsByDate[day.date];
    if (!bucket || bucket === "dry") {
      continue;
    }
    rainDaysInPeriod += 1;
    const multiplier = multipliers.revenue[bucket] ?? 1;
    if (multiplier !== 1 && multiplier > 0) {
      periodImpactCents += day.revenueCents - day.revenueCents / multiplier;
    }
  }

  return {
    ready,
    learned,
    periodImpactCents: ready ? Math.round(periodImpactCents) : null,
    rainDaysInPeriod,
  };
}

function buildObservations(args: {
  records: SalesRecordsPayload | null;
  weatherLens: SalesWeatherLensPayload | null;
  heatmap: SalesHeatmapPayload | null;
  pairings: SalesPairingsPayload | null;
  matrix: MenuMatrixPayload | null;
}): string[] {
  const observations: string[] = [];

  const firstRecord = args.records?.records[0];
  if (firstRecord) {
    observations.push(`${firstRecord.label}.`);
  }

  const lens = args.weatherLens;
  const rainEffect = lens?.learned.find((b) => b.bucket === "light_rain") ??
    lens?.learned[0];
  if (lens?.ready && rainEffect) {
    const pct = Math.abs(Math.round((rainEffect.revenueMultiplier - 1) * 100));
    const direction = rainEffect.revenueMultiplier < 1 ? "below" : "above";
    if (lens.rainDaysInPeriod > 0 && lens.periodImpactCents !== null && Math.abs(lens.periodImpactCents) >= 2000) {
      const verb = lens.periodImpactCents < 0 ? "cost you roughly" : "added roughly";
      observations.push(
        `Rain hit ${lens.rainDaysInPeriod} day${lens.rainDaysInPeriod === 1 ? "" : "s"} this period and ${verb} ${formatDollars(lens.periodImpactCents)}. Rainy days here run about ${pct}% ${direction} your dry-day normal.`,
      );
    } else if (lens.rainDaysInPeriod === 0) {
      observations.push(
        `Rainy days run about ${pct}% ${direction} your dry-day normal here. This period stayed dry.`,
      );
    }
  }

  const peak = args.heatmap?.peak;
  if (peak && args.heatmap?.peakShare && args.heatmap.peakShare >= 0.04) {
    observations.push(
      `${WEEKDAY_NAMES[peak.dow]} ${formatHourRange(peak.hour)} is your single busiest slot: ${Math.round(args.heatmap.peakShare * 100)}% of the period's revenue.`,
    );
  }

  const topPair = args.pairings?.pairs[0];
  if (topPair) {
    observations.push(
      `Orders with ${topPair.aLabel} are ${topPair.lift.toFixed(1)}x more likely to also include ${topPair.bLabel}.`,
    );
  }

  const topOpportunity = args.pairings?.opportunities[0];
  if (topOpportunity) {
    observations.push(
      `Only ${Math.round(topOpportunity.attachRate * 100)}% of ${topOpportunity.itemLabel} orders add anything from ${topOpportunity.sectionName} (venue average ${Math.round(topOpportunity.venueAttachRate * 100)}%). Closing half that gap is worth about ${formatDollars(topOpportunity.estValueCents)} over this period.`,
    );
  }

  const matrix = args.matrix;
  if (matrix && matrix.items.length >= 6) {
    const puzzles = matrix.items.filter((item) => item.quadrant === "puzzle");
    const dogs = matrix.items.filter((item) => item.quadrant === "dog");
    if (puzzles.length > 0) {
      const names = puzzles
        .slice(0, 2)
        .map((item) => item.label)
        .join(" and ");
      observations.push(
        `${puzzles.length} item${puzzles.length === 1 ? " is a Puzzle" : "s are Puzzles"} (high margin, low volume), led by ${names}. They earn well when they sell; give them better menu placement.`,
      );
    } else if (dogs.length > 0) {
      const names = dogs
        .slice(0, 2)
        .map((item) => item.label)
        .join(" and ");
      observations.push(
        `${dogs.length} item${dogs.length === 1 ? " sits" : "s sit"} in the Dog quadrant (low volume, low margin): ${names}. Candidates to rework or retire.`,
      );
    }
  }

  return observations.slice(0, 5);
}

export type SalesIntelligenceScope = "full" | "menu" | "patterns";

export async function getSalesIntelligence(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    startIso: string;
    endIso: string;
    /** Which sections to compute: tabs request subsets, overview computes everything. */
    scope?: SalesIntelligenceScope;
  },
): Promise<SalesIntelligencePayload> {
  const scope = args.scope ?? "full";
  const wantsMenu = scope !== "patterns";
  const wantsPatterns = scope !== "menu";
  const context = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new SalesIntelligenceAccessError(404, message),
      forbidden: (auth) =>
        new SalesIntelligenceAccessError(auth.status, auth.message),
    },
  );

  const connection = await loadSquareConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );

  const emptyMeta = {
    dataSource: "demo" as const,
    venueTimezone: context.timezone,
    totalOrders: 0,
    totalNetCents: 0,
  };

  if (!connection) {
    return {
      meta: emptyMeta,
      observations: [],
      matrix: null,
      pairings: null,
      heatmap: null,
      fulfillment: null,
      records: null,
      weatherLens: null,
    };
  }

  const rangeArgs = {
    venueId: context.venueId,
    startIso: args.startIso,
    endIso: args.endIso,
  };

  const [
    itemAggregates,
    unmapped,
    pairRows,
    itemSectionRows,
    sectionStats,
    basketStats,
    heatmapRows,
    dailyHistory,
    weatherRows,
  ] = await ctx.appDb.rls(async (tx) => {
    // Sequential on purpose: a single transaction connection cannot run
    // concurrent queries.
    const itemRows = wantsMenu
      ? await salesIntelligenceRepo.itemAggregates(tx, rangeArgs)
      : [];
    const unmappedRow = wantsMenu
      ? await salesIntelligenceRepo.unmappedAggregate(tx, rangeArgs)
      : null;
    const pairs = wantsMenu
      ? await salesIntelligenceRepo.itemPairs(tx, rangeArgs)
      : [];
    const itemSections = wantsMenu
      ? await salesIntelligenceRepo.itemSectionCoOccurrence(tx, rangeArgs)
      : [];
    const sections = wantsMenu
      ? await salesIntelligenceRepo.sectionStats(tx, rangeArgs)
      : [];
    const baskets = wantsMenu
      ? await salesIntelligenceRepo.basketStats(tx, rangeArgs)
      : null;
    const heatmap = wantsPatterns
      ? await salesIntelligenceRepo.hourlyHeatmap(tx, {
          ...rangeArgs,
          timezone: context.timezone,
        })
      : [];
    const history = wantsPatterns
      ? await salesIntelligenceRepo.dailySalesHistory(tx, {
          venueId: context.venueId,
        })
      : [];
    const weather = wantsPatterns
      ? await salesIntelligenceRepo.weatherHistory(tx, {
          venueId: context.venueId,
        })
      : [];
    return [
      itemRows,
      unmappedRow,
      pairs,
      itemSections,
      sections,
      baskets,
      heatmap,
      history,
      weather,
    ] as const;
  });

  const startDate = isoToLocalDate(args.startIso, context.timezone);
  const endDate = isoToLocalDate(args.endIso, context.timezone);

  const matrix = wantsMenu
    ? computeMatrix(itemAggregates, Number(unmapped?.revenue_cents) || 0)
    : null;

  const pairings = wantsMenu
    ? computePairings({
        itemAggregates,
        pairRows,
        itemSectionRows,
        sectionStats,
        totalOrders: Number(basketStats?.total_orders) || 0,
        multiItemOrders: Number(basketStats?.multi_item_orders) || 0,
      })
    : null;

  const heatmap = wantsPatterns ? computeHeatmap(heatmapRows) : null;

  const historyAggregates = historyToAggregates(dailyHistory);
  const records = wantsPatterns
    ? computeRecords(historyAggregates, startDate, endDate)
    : null;

  const bucketsByDate: Record<string, WeatherBucket> = {};
  for (const row of weatherRows) {
    bucketsByDate[row.date] = row.condition_bucket as WeatherBucket;
  }
  const weatherLens = wantsPatterns
    ? computeWeatherLens({
        history: historyAggregates,
        bucketsByDate,
        startDate,
        endDate,
      })
    : null;

  const periodHistory = historyAggregates.filter(
    (day) => day.date >= startDate && day.date <= endDate,
  );
  const fulfillment: SalesFulfillmentPayload | null =
    !wantsPatterns || periodHistory.length === 0
      ? null
      : {
          days: periodHistory.map((day) => ({
            date: day.date,
            dineInCents: day.dineInRevenueCents,
            pickUpCents: day.pickUpRevenueCents,
            deliveryCents: day.deliveryRevenueCents,
            revenueCents: day.revenueCents,
          })),
          totalDineInCents: periodHistory.reduce(
            (sum, day) => sum + day.dineInRevenueCents,
            0,
          ),
          totalPickUpCents: periodHistory.reduce(
            (sum, day) => sum + day.pickUpRevenueCents,
            0,
          ),
          totalDeliveryCents: periodHistory.reduce(
            (sum, day) => sum + day.deliveryRevenueCents,
            0,
          ),
        };

  const heatmapTotals = heatmapRows.reduce(
    (acc, row) => {
      acc.orders += Number(row.orders) || 0;
      acc.netCents += Number(row.net_cents) || 0;
      return acc;
    },
    { orders: 0, netCents: 0 },
  );

  return {
    meta: {
      dataSource: "square",
      venueTimezone: context.timezone,
      totalOrders: heatmapTotals.orders,
      totalNetCents: Math.round(heatmapTotals.netCents),
    },
    observations:
      scope === "full"
        ? buildObservations({
            records,
            weatherLens,
            heatmap,
            pairings,
            matrix,
          })
        : [],
    matrix,
    pairings,
    heatmap,
    fulfillment,
    records,
    weatherLens,
  };
}

function computePairings(args: {
  itemAggregates: ItemAggregateRow[];
  pairRows: { a_id: string; b_id: string; pair_count: number }[];
  itemSectionRows: {
    menu_item_id: string;
    section_name: string;
    both_orders: number;
  }[];
  sectionStats: { section_name: string; orders: number; revenue_cents: number }[];
  totalOrders: number;
  multiItemOrders: number;
}): SalesPairingsPayload | null {
  const { totalOrders } = args;
  if (totalOrders === 0 || args.itemAggregates.length === 0) {
    return null;
  }

  const itemsById = new Map(
    args.itemAggregates.map((row) => [
      row.menu_item_id,
      {
        label: row.name,
        sectionName: row.section_name,
        orderCount: Number(row.order_count) || 0,
      },
    ]),
  );

  const pairs: SalesPairing[] = [];
  for (const row of args.pairRows) {
    const a = itemsById.get(row.a_id);
    const b = itemsById.get(row.b_id);
    const pairCount = Number(row.pair_count) || 0;
    if (!a || !b || pairCount < MIN_PAIR_COUNT) {
      continue;
    }
    if (
      a.orderCount < MIN_PAIR_ITEM_ORDERS ||
      b.orderCount < MIN_PAIR_ITEM_ORDERS
    ) {
      continue;
    }
    const lift = (pairCount * totalOrders) / (a.orderCount * b.orderCount);
    if (lift < MIN_PAIR_LIFT) {
      continue;
    }
    // Anchor the sentence on the higher-volume item.
    const [anchorId, anchor, otherId, other] =
      a.orderCount >= b.orderCount
        ? ([row.a_id, a, row.b_id, b] as const)
        : ([row.b_id, b, row.a_id, a] as const);
    pairs.push({
      aId: anchorId,
      aLabel: anchor.label,
      bId: otherId,
      bLabel: other.label,
      pairCount,
      aOrderCount: anchor.orderCount,
      bOrderCount: other.orderCount,
      lift: Math.round(lift * 10) / 10,
      attachRate: anchor.orderCount > 0 ? pairCount / anchor.orderCount : 0,
    });
  }
  pairs.sort((x, y) => y.lift - x.lift || y.pairCount - x.pairCount);

  // Attach opportunities: high-volume items whose buyers skip a big section.
  const sectionsByRevenue = [...args.sectionStats].sort(
    (x, y) => Number(y.revenue_cents) - Number(x.revenue_cents),
  );
  const topSections = sectionsByRevenue.slice(0, 3);

  const coOccurrence = new Map<string, number>();
  for (const row of args.itemSectionRows) {
    coOccurrence.set(
      `${row.menu_item_id}::${row.section_name}`,
      Number(row.both_orders) || 0,
    );
  }

  const topItems = [...itemsById.entries()]
    .filter(([, item]) => item.orderCount >= MIN_OPPORTUNITY_ITEM_ORDERS)
    .sort((x, y) => y[1].orderCount - x[1].orderCount)
    .slice(0, 6);

  const opportunities: SalesAttachOpportunity[] = [];
  for (const section of topSections) {
    const sectionOrders = Number(section.orders) || 0;
    const sectionRevenue = Number(section.revenue_cents) || 0;
    if (sectionOrders === 0) {
      continue;
    }
    const venueAttachRate = sectionOrders / totalOrders;
    const avgSectionSpendCents = sectionRevenue / sectionOrders;
    for (const [itemId, item] of topItems) {
      if (item.sectionName === section.section_name) {
        continue;
      }
      const both = coOccurrence.get(`${itemId}::${section.section_name}`) ?? 0;
      const attachRate = both / item.orderCount;
      if (attachRate >= venueAttachRate * 0.6) {
        continue;
      }
      const gapOrders = (venueAttachRate - attachRate) * item.orderCount;
      opportunities.push({
        menuItemId: itemId,
        itemLabel: item.label,
        sectionName: section.section_name,
        itemOrders: item.orderCount,
        attachRate,
        venueAttachRate,
        estValueCents: Math.round(gapOrders * avgSectionSpendCents * 0.5),
      });
    }
  }
  opportunities.sort((x, y) => y.estValueCents - x.estValueCents);

  return {
    pairs: pairs.slice(0, MAX_PAIRS),
    opportunities: opportunities.slice(0, MAX_OPPORTUNITIES),
    basketOrders: totalOrders,
    multiItemShare: totalOrders > 0 ? args.multiItemOrders / totalOrders : 0,
  };
}
