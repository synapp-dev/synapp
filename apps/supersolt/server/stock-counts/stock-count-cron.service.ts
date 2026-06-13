import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import type { AppDb } from "@/server/db/create-app-db";
import { stockCountSchedulesRepo } from "@/server/stock-counts/stock-count-schedules.repo";
import { stockCountsRepo } from "@/server/stock-counts/stock-counts.repo";
import { trackStockCountsEvent } from "@/server/stock-counts/stock-counts-telemetry";

function formatCountName(date = new Date()): string {
  return `Count ${date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function isScheduleDueToday(args: {
  cadence: string;
  timezone: string;
  now?: Date;
}): boolean {
  const now = args.now ?? new Date();
  const localDate = formatShiftDateInVenue(now.toISOString(), args.timezone);
  const dayOfWeek = new Date(`${localDate}T12:00:00`).getDay();
  const dayOfMonth = Number(localDate.slice(8, 10));

  switch (args.cadence) {
    case "weekly":
      return dayOfWeek === 1;
    case "fortnightly":
      return dayOfWeek === 1 && Math.floor(now.getTime() / (7 * 86400000)) % 2 === 0;
    case "monthly":
      return dayOfMonth === 1;
    default:
      return false;
  }
}

function pickCycleIngredients<T extends { id: string }>(
  rows: T[],
  fraction = 0.25,
): T[] {
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const count = Math.max(1, Math.ceil(shuffled.length * fraction));
  return shuffled.slice(0, count);
}

export const stockCountCronService = {
  async runReminders(appDb: AppDb): Promise<{
    overdueVenues: number;
    archivedStale: number;
    spawnedCounts: number;
  }> {
    const overdue = await stockCountSchedulesRepo.listOverdueVenues(appDb, 14);
    for (const venue of overdue) {
      trackStockCountsEvent("stock_counts.reminder_overdue", {
        venueId: venue.venueId,
        lastApprovedAt: venue.lastApprovedAt,
      });
    }

    const archivedStale = await stockCountSchedulesRepo.archiveStaleInProgress(
      appDb,
      7,
    );

    const spawnedCounts = await this.spawnDueScheduledCounts(appDb);

    return {
      overdueVenues: overdue.length,
      archivedStale,
      spawnedCounts,
    };
  },

  async spawnDueScheduledCounts(appDb: AppDb): Promise<number> {
    const schedules = await stockCountSchedulesRepo.listActiveSchedules(appDb);
    let spawned = 0;
    const now = new Date().toISOString();

    for (const { schedule, timezone } of schedules) {
      if (!isScheduleDueToday({ cadence: schedule.cadence, timezone })) {
        continue;
      }

      const hasActive = await stockCountSchedulesRepo.hasInProgressCount(
        appDb,
        schedule.venueId,
      );
      if (hasActive) continue;

      const scopeFilter =
        (schedule.defaultScopeFilter as Record<string, unknown>) ?? {};
      const scopeType = schedule.defaultScopeType;

      let ingredientRows = await stockCountsRepo.listActiveIngredientsAdmin(
        appDb,
        {
          organisationId: schedule.organisationId,
          venueId: schedule.venueId,
          categories: Array.isArray(scopeFilter.categories)
            ? (scopeFilter.categories as string[])
            : undefined,
          ingredientIds: Array.isArray(scopeFilter.ingredientIds)
            ? (scopeFilter.ingredientIds as string[])
            : undefined,
        },
      );

      if (scopeType === "cycle") {
        const fraction =
          typeof scopeFilter.cycleFraction === "number"
            ? scopeFilter.cycleFraction
            : 0.25;
        ingredientRows = pickCycleIngredients(ingredientRows, fraction);
      }

      if (ingredientRows.length === 0) continue;

      const { count: prevCount, entries: prevEntries } =
        await stockCountsRepo.getPreviousApprovedEntriesAdmin(appDb, {
          venueId: schedule.venueId,
        });

      const prevByIngredient = new Map(
        prevEntries.map((e) => [e.ingredientId, Number(e.countedQty ?? 0)]),
      );

      const count = await stockCountsRepo.insertCountAdmin(appDb, {
        organisationId: schedule.organisationId,
        venueId: schedule.venueId,
        scheduleId: schedule.id,
        name: formatCountName(),
        status: "in_progress",
        scopeType,
        scopeFilter,
        assigneeUserId: schedule.defaultAssigneeUserId,
        createdByUserId: schedule.defaultAssigneeUserId,
        startedAt: now,
        isBaseline: !prevCount,
        scheduledAt: now,
      });

      await stockCountsRepo.bulkInsertEntriesAdmin(
        appDb,
        ingredientRows.map((ing) => ({
          countId: count.id,
          ingredientId: ing.id,
          previousCountQty:
            prevByIngredient.get(ing.id) !== undefined
              ? String(prevByIngredient.get(ing.id))
              : null,
          unitUsed: ing.unit,
        })),
      );

      trackStockCountsEvent("stock_counts.scheduled_spawned", {
        venueId: schedule.venueId,
        countId: count.id,
        scheduleId: schedule.id,
      });

      spawned += 1;
    }

    return spawned;
  },
};
