import { addDays, parseISO } from "date-fns";

import type { AppDb } from "@/server/db/create-app-db";
import {
  formatShiftDateInVenue,
  venueCalendarDayBoundsUtc,
} from "@/lib/roster/venue-time";
import { consumptionDailyRepo } from "@/server/stock-counts/consumption-daily.repo";

type DailyAgg = {
  qty: number;
  salesLines: number;
  recipeHits: number;
};

function aggregateConsumption(args: {
  orderLines: Awaited<
    ReturnType<typeof consumptionDailyRepo.listOrderLinesInRange>
  >;
  bomByMenuItem: Map<string, Array<{ ingredientId: string; qtyPerUnitSold: number }>>;
  timezone: string;
}): Map<string, Map<string, DailyAgg>> {
  const byDate = new Map<string, Map<string, DailyAgg>>();

  for (const line of args.orderLines) {
    if (!line.menuItemId || line.matchSource === "unmapped") continue;
    const bom = args.bomByMenuItem.get(line.menuItemId);
    if (!bom?.length) continue;

    const date = formatShiftDateInVenue(line.observedAt, args.timezone);
    const soldQty = Number(line.quantity);
    if (!Number.isFinite(soldQty) || soldQty <= 0) continue;

    let dayMap = byDate.get(date);
    if (!dayMap) {
      dayMap = new Map();
      byDate.set(date, dayMap);
    }

    for (const entry of bom) {
      const prev = dayMap.get(entry.ingredientId) ?? {
        qty: 0,
        salesLines: 0,
        recipeHits: 0,
      };
      prev.qty += soldQty * entry.qtyPerUnitSold;
      prev.salesLines += 1;
      prev.recipeHits += 1;
      dayMap.set(entry.ingredientId, prev);
    }
  }

  return byDate;
}

export const consumptionDailyService = {
  async recomputeVenue(
    appDb: AppDb,
    args: {
      venueId: string;
      timezone: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<number> {
    const { dayStartUtc } = venueCalendarDayBoundsUtc(args.fromDate, args.timezone);
    const { dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(
      args.toDate,
      args.timezone,
    );

    const [bomLines, orderLines] = await Promise.all([
      consumptionDailyRepo.loadBomForVenue(appDb, args.venueId),
      consumptionDailyRepo.listOrderLinesInRange(appDb, {
        venueId: args.venueId,
        startIso: dayStartUtc.toISOString(),
        endIso: dayEndExclusiveUtc.toISOString(),
      }),
    ]);

    const bomByMenuItem = new Map<
      string,
      Array<{ ingredientId: string; qtyPerUnitSold: number }>
    >();
    for (const line of bomLines) {
      const list = bomByMenuItem.get(line.menuItemId) ?? [];
      list.push({
        ingredientId: line.ingredientId,
        qtyPerUnitSold: line.qtyPerUnitSold,
      });
      bomByMenuItem.set(line.menuItemId, list);
    }

    const aggregated = aggregateConsumption({
      orderLines,
      bomByMenuItem,
      timezone: args.timezone,
    });

    const upsertRows: Array<{
      venueId: string;
      ingredientId: string;
      date: string;
      qtyConsumedBaseUnits: number;
      sourceRecipeCount: number;
      sourceSalesCount: number;
    }> = [];

    for (const [date, ingredientMap] of aggregated) {
      for (const [ingredientId, agg] of ingredientMap) {
        upsertRows.push({
          venueId: args.venueId,
          ingredientId,
          date,
          qtyConsumedBaseUnits: agg.qty,
          sourceRecipeCount: agg.recipeHits,
          sourceSalesCount: agg.salesLines,
        });
      }
    }

    return consumptionDailyRepo.upsertDailyRows(appDb, upsertRows);
  },

  async recomputeAllVenues(appDb: AppDb, lookbackDays = 30): Promise<{
    venuesProcessed: number;
    rowsUpserted: number;
  }> {
    const venues = await consumptionDailyRepo.listVenuesWithSales(appDb);
    let rowsUpserted = 0;

    for (const venue of venues) {
      const toDate = formatShiftDateInVenue(
        new Date().toISOString(),
        venue.timezone,
      );
      const fromDate = formatShiftDateInVenue(
        addDays(parseISO(toDate), -lookbackDays).toISOString(),
        venue.timezone,
      );
      rowsUpserted += await this.recomputeVenue(appDb, {
        venueId: venue.venueId,
        timezone: venue.timezone,
        fromDate,
        toDate,
      });
    }

    return { venuesProcessed: venues.length, rowsUpserted };
  },

  async refreshWindow(
    appDb: AppDb,
    args: {
      venueId: string;
      timezone: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<number> {
    return this.recomputeVenue(appDb, args);
  },
};
