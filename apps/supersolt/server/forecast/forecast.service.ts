import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import { todayCalendarIsoInVenue } from "@/lib/roster/venue-time";
import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type { AppDb } from "@/server/db/create-app-db";
import {
  forecastRepo,
  type DailySalesRow as DailySalesDbRow,
  type ForecastRow as ForecastDbRow,
  type VenueForecastStateRow,
} from "@/server/forecast/forecast.repo";
import { loadSquareConnectionForVenue } from "@/server/sales/sales-insights.service";
import { runBackfillSquareSync } from "@/server/square/square-sync.service";
import { aggregateOrdersToDailySales } from "@/lib/sales/daily-sales-aggregate";
import {
  computeForecasts,
  computeForecastsForDateRange,
} from "@/server/forecast/compute-forecast";
import {
  countDistinctHistoryDays,
  isForecastReady,
} from "@/server/forecast/forecast-confidence";
import { isWeatherForecastEnabled } from "@/server/weather/weather-flag";
import type { ForecastWeatherContext } from "@/server/weather/weather-multipliers";
import { resolveCalendarRegion } from "@/server/calendar/au-calendar";
import {
  fitCalendarMultipliers,
  type ForecastCalendarContext,
} from "@/server/calendar/calendar-multipliers";
import type {
  ForecastEvent,
  ForecastEventContext,
  ForecastEventKind,
} from "@/server/forecast/forecast-events";
import type { VenueCalendarEventRow } from "@/server/forecast/forecast.repo";
import {
  getForecastWeatherContext,
  listVenueWeatherRange,
  type VenueWeatherDayDto,
} from "@/server/weather/weather.service";
import type {
  DailySalesAggregate,
  DailySalesRow,
  ForecastRow,
  VenueForecastStateDto,
} from "@/server/forecast/types";
/** @deprecated Use AuthError */
export class VenueAccessError extends AuthError {}

function toDailySalesInsert(venueId: string, row: DailySalesAggregate) {
  return {
    venueId,
    date: row.date,
    revenueCents: row.revenueCents,
    ordersCount: row.ordersCount,
    avgCheckCents: row.avgCheckCents,
    refundsCount: row.refundsCount,
    refundsValueCents: row.refundsValueCents,
    voidsCount: row.voidsCount,
    dineInRevenueCents: row.dineInRevenueCents,
    pickUpRevenueCents: row.pickUpRevenueCents,
    deliveryRevenueCents: row.deliveryRevenueCents,
    source: "square",
    computedAt: new Date().toISOString(),
  };
}

function mapDailySalesRow(row: DailySalesDbRow): DailySalesRow {
  return {
    venueId: row.venueId,
    date: row.date,
    revenueCents: row.revenueCents,
    ordersCount: row.ordersCount,
    avgCheckCents: row.avgCheckCents,
    refundsCount: row.refundsCount,
    refundsValueCents: row.refundsValueCents,
    voidsCount: row.voidsCount,
    dineInRevenueCents: row.dineInRevenueCents,
    pickUpRevenueCents: row.pickUpRevenueCents,
    deliveryRevenueCents: row.deliveryRevenueCents,
    source: row.source,
    computedAt: row.computedAt,
  };
}

function mapForecastRow(row: ForecastDbRow): ForecastRow {
  return {
    date: row.date,
    metric: row.metric as ForecastRow["metric"],
    forecastValue: Number(row.forecastValue),
    confidence: row.confidence as ForecastRow["confidence"],
    confidenceLowerBound:
      row.confidenceLowerBound === null
        ? null
        : Number(row.confidenceLowerBound),
    confidenceUpperBound:
      row.confidenceUpperBound === null
        ? null
        : Number(row.confidenceUpperBound),
    inputs: row.inputs as ForecastRow["inputs"],
  };
}

function forecastRowKey(row: ForecastRow): string {
  return `${row.date}:${row.metric}`;
}

/** Prefer persisted forward forecasts for today+; backcasts fill historical gaps. */
function mergeComputedAndStoredForecasts(
  computed: ForecastRow[],
  stored: ForecastRow[],
  todayIso: string
): ForecastRow[] {
  const byKey = new Map(computed.map((row) => [forecastRowKey(row), row]));

  for (const row of stored) {
    if (row.date >= todayIso) {
      byKey.set(forecastRowKey(row), row);
    }
  }

  return [...byKey.values()].sort((left, right) => {
    const dateCmp = left.date.localeCompare(right.date);
    if (dateCmp !== 0) {
      return dateCmp;
    }
    return left.metric.localeCompare(right.metric);
  });
}

async function loadDailySalesHistoryForUser(
  appDb: AppDb,
  venueId: string,
  throughDate: string,
): Promise<DailySalesAggregate[]> {
  const data = await appDb.rls((tx) =>
    forecastRepo.listDailySalesHistoryForUser(tx, venueId, throughDate),
  );

  return data.map((row) => {
    const mapped = mapDailySalesRow(row);
    return {
      date: mapped.date,
      revenueCents: mapped.revenueCents,
      ordersCount: mapped.ordersCount,
      avgCheckCents: mapped.avgCheckCents,
      refundsCount: mapped.refundsCount,
      refundsValueCents: mapped.refundsValueCents,
      voidsCount: mapped.voidsCount,
      dineInRevenueCents: mapped.dineInRevenueCents,
      pickUpRevenueCents: mapped.pickUpRevenueCents,
      deliveryRevenueCents: mapped.deliveryRevenueCents,
    };
  });
}

export async function upsertDailySalesFromOrders(
  appDb: AppDb,
  args: {
    venueId: string;
    orders: SalesOrderRow[];
    timezone: string;
  }
): Promise<void> {
  const aggregates = aggregateOrdersToDailySales(args.orders, args.timezone);
  if (aggregates.length === 0) {
    return;
  }

  const rows = aggregates.map((a) => toDailySalesInsert(args.venueId, a));
  try {
    await forecastRepo.upsertDailySales(appDb, rows);
  } catch (error) {
    console.error("[forecast] daily_sales upsert", error);
    throw new Error("Failed to persist daily sales");
  }
}

async function loadDailySalesHistory(
  appDb: AppDb,
  venueId: string,
): Promise<DailySalesAggregate[]> {
  const data = await forecastRepo.listDailySalesHistory(appDb, venueId);

  return data.map((row) => {
    const mapped = mapDailySalesRow(row);
    return {
      date: mapped.date,
      revenueCents: mapped.revenueCents,
      ordersCount: mapped.ordersCount,
      avgCheckCents: mapped.avgCheckCents,
      refundsCount: mapped.refundsCount,
      refundsValueCents: mapped.refundsValueCents,
      voidsCount: mapped.voidsCount,
      dineInRevenueCents: mapped.dineInRevenueCents,
      pickUpRevenueCents: mapped.pickUpRevenueCents,
      deliveryRevenueCents: mapped.deliveryRevenueCents,
    };
  });
}

/**
 * Calendar context (public-holiday multipliers + region) when the venue maps to a supported region.
 * Deterministic and offline, so it is always built; forecast computation never fails on calendar.
 */
async function loadCalendarContext(
  appDb: AppDb,
  venueId: string,
  history: DailySalesAggregate[],
): Promise<ForecastCalendarContext | undefined> {
  try {
    const info = await forecastRepo.getVenueRegionInfo(appDb, venueId);
    const region = resolveCalendarRegion(info?.state, info?.country);
    if (!region) {
      return undefined;
    }
    return { region, multipliers: fitCalendarMultipliers({ history, region }) };
  } catch (error) {
    console.error("[forecast] calendar context load failed", error);
    return undefined;
  }
}

function toForecastEvent(row: VenueCalendarEventRow): ForecastEvent {
  return {
    kind: row.kind as ForecastEventKind,
    startDate: row.startDate,
    endDate: row.endDate,
    title: row.title,
    expectedMultiplier:
      row.expectedMultiplier === null ? null : Number(row.expectedMultiplier),
  };
}

/** Operator calendar events (closures, promos, price changes); never fails the forecast. */
async function loadEventContext(
  appDb: AppDb,
  venueId: string,
): Promise<ForecastEventContext | undefined> {
  try {
    const rows = await forecastRepo.listCalendarEventsForVenue(appDb, venueId);
    if (rows.length === 0) {
      return undefined;
    }
    return { events: rows.map(toForecastEvent) };
  } catch (error) {
    console.error("[forecast] event context load failed", error);
    return undefined;
  }
}

/** Weather context when the flag is on; forecast computation never fails on weather. */
async function loadWeatherContext(
  appDb: AppDb,
  venueId: string,
  history: DailySalesAggregate[],
): Promise<ForecastWeatherContext | undefined> {
  if (!isWeatherForecastEnabled()) {
    return undefined;
  }
  try {
    return (
      (await getForecastWeatherContext(appDb, { venueId, history })) ?? undefined
    );
  } catch (error) {
    console.error("[forecast] weather context load failed", error);
    return undefined;
  }
}

export async function recomputeForecastsForVenue(
  appDb: AppDb,
  args: {
    venueId: string;
    timezone: string;
    dataStartsFrom?: string | null;
  }
): Promise<{ forecastCount: number; availableHistoryDays: number; forecastReady: boolean }> {
  const history = await loadDailySalesHistory(appDb, args.venueId);
  const availableHistoryDays = countDistinctHistoryDays(history.map((h) => h.date));
  const todayIso = todayCalendarIsoInVenue(args.timezone);
  const weather = await loadWeatherContext(appDb, args.venueId, history);
  const calendar = await loadCalendarContext(appDb, args.venueId, history);
  const events = await loadEventContext(appDb, args.venueId);
  const computed = computeForecasts({
    history,
    todayIso,
    dataStartsFrom: args.dataStartsFrom ?? null,
    weather,
    calendar,
    events,
  });

  if (computed.length > 0) {
    const inserts = computed.map((f) => ({
      venueId: args.venueId,
      date: f.date,
      metric: f.metric,
      forecastValue: String(f.forecastValue),
      confidence: f.confidence,
      confidenceLowerBound:
        f.confidenceLowerBound === null ? null : String(f.confidenceLowerBound),
      confidenceUpperBound:
        f.confidenceUpperBound === null ? null : String(f.confidenceUpperBound),
      inputs: f.inputs,
      computedAt: new Date().toISOString(),
    }));

    try {
      await forecastRepo.upsertForecasts(appDb, inserts);
    } catch (error) {
      console.error("[forecast] forecasts upsert", error);
      throw new Error("Failed to persist forecasts");
    }
  }

  const forecastReady = isForecastReady(availableHistoryDays);
  const now = new Date().toISOString();

  try {
    await forecastRepo.upsertVenueForecastState(appDb, {
      venueId: args.venueId,
      availableHistoryDays,
      forecastReady,
      lastComputedAt: now,
      updatedAt: now,
    });
  } catch (stateError) {
    console.error("[forecast] venue_forecast_state upsert", stateError);
  }

  return {
    forecastCount: computed.length,
    availableHistoryDays,
    forecastReady,
  };
}

export async function syncDailySalesAndForecastsFromOrders(
  appDb: AppDb | null,
  args: {
    venueId: string;
    timezone: string;
    orders: SalesOrderRow[];
    dataStartsFrom?: string | null;
  }
): Promise<void> {
  if (!appDb || args.orders.length === 0) {
    return;
  }

  await upsertDailySalesFromOrders(appDb, {
    venueId: args.venueId,
    orders: args.orders,
    timezone: args.timezone,
  });

  const now = new Date().toISOString();
  await forecastRepo.upsertVenueForecastState(appDb, {
    venueId: args.venueId,
    lastDailySalesSyncAt: now,
    updatedAt: now,
  });

  await recomputeForecastsForVenue(appDb, {
    venueId: args.venueId,
    timezone: args.timezone,
    dataStartsFrom: args.dataStartsFrom,
  });
}

export async function backfillDailySalesFromSquare(
  appDb: AppDb,
  args: {
    venueId: string;
    organisationId: string;
    timezone: string;
    accessToken: string;
    environment: string;
    locationId: string | null;
    daysBack: number;
    dataStartsFrom?: string | null;
  }
): Promise<{ orderCount: number; dayCount: number }> {
  const result = await runBackfillSquareSync(appDb, {
    venueId: args.venueId,
    organisationId: args.organisationId,
    timezone: args.timezone,
    accessToken: args.accessToken,
    environment: args.environment,
    locationId: args.locationId,
    daysBack: args.daysBack,
    dataStartsFrom: args.dataStartsFrom,
  });

  return { orderCount: result.paymentCount, dayCount: result.dayCount };
}

async function resolveVenueContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new VenueAccessError(404, message),
    forbidden: (auth) => auth,
  });
}

export async function getDailySalesForVenue(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    fromDate: string;
    toDate: string;
  },
): Promise<{
  rows: DailySalesRow[];
  state: VenueForecastStateDto | null;
  weather: VenueWeatherDayDto[];
}> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const [data, stateRow] = await ctx.appDb.rls(async (tx) => {
    const rows = await forecastRepo.listDailySalesInRange(tx, {
      venueId: context.venueId,
      fromDate: args.fromDate,
      toDate: args.toDate,
    });
    const state = await forecastRepo.getVenueForecastState(tx, context.venueId);
    return [rows, state] as const;
  });

  let weather: VenueWeatherDayDto[] = [];
  if (isWeatherForecastEnabled()) {
    try {
      weather = await listVenueWeatherRange(ctx.appDb, {
        venueId: context.venueId,
        fromDate: args.fromDate,
        toDate: args.toDate,
      });
    } catch (error) {
      console.error("[forecast] daily-sales weather load failed", error);
    }
  }

  return {
    rows: data.map(mapDailySalesRow),
    state: stateRow ? mapVenueForecastState(stateRow) : null,
    weather,
  };
}

export async function getForecastsForVenue(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    fromDate: string;
    toDate: string;
  },
): Promise<{ forecasts: ForecastRow[]; state: VenueForecastStateDto | null }> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const stateRow = await ctx.appDb.rls((tx) =>
    forecastRepo.getVenueForecastState(tx, context.venueId),
  );

  const state = stateRow ? mapVenueForecastState(stateRow) : null;

  if (!state?.forecastReady) {
    return { forecasts: [], state };
  }

  const storedRows = await ctx.appDb.rls((tx) =>
    forecastRepo.listForecastsInRange(tx, {
      venueId: context.venueId,
      fromDate: args.fromDate,
      toDate: args.toDate,
    }),
  );

  const history = await loadDailySalesHistoryForUser(
    ctx.appDb,
    context.venueId,
    args.toDate,
  );

  const todayIso = todayCalendarIsoInVenue(context.timezone);
  const weather = await loadWeatherContext(ctx.appDb, context.venueId, history);
  const calendar = await loadCalendarContext(
    ctx.appDb,
    context.venueId,
    history,
  );
  const events = await loadEventContext(ctx.appDb, context.venueId);
  const computed = computeForecastsForDateRange({
    history,
    fromDate: args.fromDate,
    toDate: args.toDate,
    dataStartsFrom: state.dataStartsFrom,
    weather,
    calendar,
    events,
  });

  const forecasts = mergeComputedAndStoredForecasts(
    computed,
    storedRows.map(mapForecastRow),
    todayIso,
  );

  return { forecasts, state };
}

function mapVenueForecastState(row: VenueForecastStateRow): VenueForecastStateDto {
  return {
    availableHistoryDays: row.availableHistoryDays,
    forecastReady: row.forecastReady,
    backfillStatus: row.backfillStatus,
    backfillProgress:
      row.backfillProgress && typeof row.backfillProgress === "object"
        ? (row.backfillProgress as Record<string, unknown>)
        : null,
    dataStartsFrom: row.dataStartsFrom,
    lastDailySalesSyncAt: row.lastDailySalesSyncAt,
    lastPaymentsSyncAt: row.lastPaymentsSyncAt,
    lastComputedAt: row.lastComputedAt,
  };
}

export async function getVenueForecastState(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<VenueForecastStateDto | null> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const stateRow = await ctx.appDb.rls((tx) =>
    forecastRepo.getVenueForecastState(tx, context.venueId),
  );

  return stateRow ? mapVenueForecastState(stateRow) : null;
}

export async function recomputeForecastsOnly(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<{ forecastCount: number; availableHistoryDays: number; forecastReady: boolean }> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const stateRow = await forecastRepo.getVenueForecastStateAdmin(
    ctx.appDb,
    context.venueId,
  );

  return recomputeForecastsForVenue(ctx.appDb, {
    venueId: context.venueId,
    timezone: context.timezone,
    dataStartsFrom: stateRow?.dataStartsFrom ?? null,
  });
}

export async function syncForecastBackfill(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    daysBack?: number;
  },
): Promise<{ orderCount: number; dayCount: number; forecastReady: boolean }> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const connection = await loadSquareConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );

  if (!connection) {
    throw new VenueAccessError(400, "Square is not connected for this venue");
  }

  const result = await backfillDailySalesFromSquare(ctx.appDb, {
    venueId: context.venueId,
    organisationId: context.organisationId,
    timezone: context.timezone,
    accessToken: connection.squareAccessToken,
    environment: connection.environment,
    locationId: connection.squareLocationId,
    daysBack: args.daysBack ?? 90,
  });

  const stateRow = await forecastRepo.getVenueForecastStateAdmin(
    ctx.appDb,
    context.venueId,
  );

  return {
    ...result,
    forecastReady: stateRow?.forecastReady ?? false,
  };
}
