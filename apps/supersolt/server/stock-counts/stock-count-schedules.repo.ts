import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { stockCountsRepo } from "@/server/stock-counts/stock-counts.repo";
import { stockCountSchedules, stockCounts, venues } from "@/server/db/schema";

export const stockCountSchedulesRepo = {
  async listForVenue(tx: RlsTx, venueId: string) {
    return tx
      .select()
      .from(stockCountSchedules)
      .where(eq(stockCountSchedules.venueId, venueId))
      .orderBy(desc(stockCountSchedules.createdAt));
  },

  async upsert(
    tx: RlsTx,
    row: typeof stockCountSchedules.$inferInsert,
  ) {
    const existing = await tx
      .select()
      .from(stockCountSchedules)
      .where(eq(stockCountSchedules.venueId, row.venueId))
      .limit(1);

    if (existing[0]) {
      const updated = await tx
        .update(stockCountSchedules)
        .set({
          cadence: row.cadence,
          cronExpression: row.cronExpression,
          defaultAssigneeUserId: row.defaultAssigneeUserId,
          defaultScopeType: row.defaultScopeType,
          defaultScopeFilter: row.defaultScopeFilter,
          isPaused: row.isPaused,
        })
        .where(eq(stockCountSchedules.id, existing[0].id))
        .returning();
      return updated[0]!;
    }

    const inserted = await tx.insert(stockCountSchedules).values(row).returning();
    return inserted[0]!;
  },

  async setPaused(tx: RlsTx, scheduleId: string, isPaused: boolean) {
    const updated = await tx
      .update(stockCountSchedules)
      .set({ isPaused })
      .where(eq(stockCountSchedules.id, scheduleId))
      .returning();
    return updated[0] ?? null;
  },

  async listActiveSchedules(appDb: AppDb) {
    return appDb.admin
      .select({
        schedule: stockCountSchedules,
        timezone: venues.timezone,
      })
      .from(stockCountSchedules)
      .innerJoin(venues, eq(venues.id, stockCountSchedules.venueId))
      .where(
        and(eq(stockCountSchedules.isPaused, false), isNull(venues.archivedAt)),
      );
  },

  async hasInProgressCount(appDb: AppDb, venueId: string): Promise<boolean> {
    const rows = await appDb.admin
      .select({ id: stockCounts.id })
      .from(stockCounts)
      .where(
        and(
          eq(stockCounts.venueId, venueId),
          eq(stockCounts.status, "in_progress"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async archiveStaleInProgress(appDb: AppDb, staleDays: number): Promise<number> {
    const cutoff = new Date(
      Date.now() - staleDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const result = await appDb.admin
      .update(stockCounts)
      .set({
        status: "archived",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(stockCounts.status, "in_progress"),
          lt(stockCounts.startedAt, cutoff),
        ),
      )
      .returning({ id: stockCounts.id });
    return result.length;
  },

  async listOverdueVenues(appDb: AppDb, overdueDays: number) {
    const venueRows = await appDb.admin
      .select({
        venueId: venues.id,
        organisationId: venues.organisationId,
        venueName: venues.name,
      })
      .from(venues)
      .where(isNull(venues.archivedAt));

    const cutoffMs = Date.now() - overdueDays * 24 * 60 * 60 * 1000;
    const overdue: Array<{
      venueId: string;
      organisationId: string;
      venueName: string;
      lastApprovedAt: string | null;
    }> = [];

    for (const venue of venueRows) {
      const lastApprovedAt = await stockCountsRepo.getLastApprovedAtAdmin(
        appDb,
        venue.venueId,
      );
      if (
        !lastApprovedAt ||
        new Date(lastApprovedAt).getTime() < cutoffMs
      ) {
        overdue.push({ ...venue, lastApprovedAt });
      }
    }

    return overdue;
  },
};
