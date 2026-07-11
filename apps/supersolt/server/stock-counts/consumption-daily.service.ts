import type { AppDb } from "@/server/db/create-app-db";
import { consumptionService } from "@/server/consumption/consumption.service";

/**
 * Legacy facade — the consumption engine now lives in
 * `server/consumption/`. These delegates keep the original call sites
 * (stock count submit, older callers) working, but the physics changed:
 * closed days are immutable once finalized (recipe edits apply forward
 * only), sub-recipes explode recursively to raws, units convert, and
 * facts carry cost. See docs/features/stock-management/consumption-engine/plan.md.
 */
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
    return consumptionService.refreshWindow(appDb, args);
  },

  async recomputeAllVenues(appDb: AppDb): Promise<{
    venuesProcessed: number;
    rowsUpserted: number;
  }> {
    const result = await consumptionService.runNightly(appDb);
    return {
      venuesProcessed: result.venuesProcessed,
      rowsUpserted: result.daysComputed,
    };
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
    return consumptionService.refreshWindow(appDb, args);
  },
};
