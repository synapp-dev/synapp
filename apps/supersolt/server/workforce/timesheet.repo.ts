import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  organisations,
  payPeriods,
  payrollTimesheetLines,
  rosterShifts,
  timesheetAuditLog,
  timesheetClockEvents,
  timesheetDisputes,
  timesheets,
  userProfiles,
  venues,
} from "@/server/db/schema";

export type TimesheetRow = typeof timesheets.$inferSelect;
export type PayPeriodRow = typeof payPeriods.$inferSelect;

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const timesheetRepo = {
  async getOrgTimesheetSettings(tx: RlsTx, organisationId: string) {
    const rows = await tx
      .select({
        payPeriodFrequency: organisations.timesheetPayPeriodFrequency,
        periodStartDow: organisations.timesheetPeriodStartDow,
        matchToleranceMin: organisations.timesheetMatchToleranceMin,
        ownerApprovalVarianceMin: organisations.timesheetOwnerApprovalVarianceMin,
        geolocationEnabled: organisations.timesheetGeolocationEnabled,
        breakMode: organisations.timesheetBreakMode,
        autoDeductBreakMin: organisations.timesheetAutoDeductBreakMin,
        autoDeductAfterHours: organisations.timesheetAutoDeductAfterHours,
        roundingMinutes: organisations.timesheetRoundingMinutes,
        approvalWindowHours: organisations.timesheetApprovalWindowHours,
      })
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    return (
      rows[0] ?? {
        payPeriodFrequency: "fortnightly" as const,
        periodStartDow: 1,
        matchToleranceMin: 5,
        ownerApprovalVarianceMin: 120,
        geolocationEnabled: false,
        breakMode: "explicit_events" as const,
        autoDeductBreakMin: 30,
        autoDeductAfterHours: "5",
        roundingMinutes: 0,
        approvalWindowHours: 48,
      }
    );
  },

  async getVenueLocation(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({
        lat: venues.locationLat,
        lng: venues.locationLng,
        radiusM: venues.geolocationRadiusM,
        timezone: venues.timezone,
      })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findPayPeriod(
    tx: RlsTx,
    organisationId: string,
    startDate: string,
    endDate: string,
  ) {
    const rows = await tx
      .select()
      .from(payPeriods)
      .where(
        and(
          eq(payPeriods.organisationId, organisationId),
          eq(payPeriods.startDate, startDate),
          eq(payPeriods.endDate, endDate),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async insertPayPeriod(tx: RlsTx, row: typeof payPeriods.$inferInsert) {
    const inserted = await tx.insert(payPeriods).values(row).returning();
    return inserted[0]!;
  },

  async listPayPeriods(tx: RlsTx, organisationId: string, limit = 12) {
    return tx
      .select()
      .from(payPeriods)
      .where(eq(payPeriods.organisationId, organisationId))
      .orderBy(desc(payPeriods.startDate))
      .limit(limit);
  },

  async getPayPeriodById(tx: RlsTx, payPeriodId: string) {
    const rows = await tx.select().from(payPeriods).where(eq(payPeriods.id, payPeriodId)).limit(1);
    return rows[0] ?? null;
  },

  async listEntries(
    tx: RlsTx,
    args: {
      venueId: string;
      payPeriodId?: string;
      userProfileId?: string;
      status?: string;
    },
  ) {
    const conditions = [eq(timesheets.venueId, args.venueId)];
    if (args.payPeriodId) conditions.push(eq(timesheets.payPeriodId, args.payPeriodId));
    if (args.userProfileId) conditions.push(eq(timesheets.userProfileId, args.userProfileId));
    if (args.status) conditions.push(eq(timesheets.status, args.status as TimesheetRow["status"]));

    return tx
      .select()
      .from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.workDate), asc(timesheets.rosteredStartsAt));
  },

  async getEntryById(tx: RlsTx, timesheetId: string, venueId: string) {
    const rows = await tx
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, timesheetId), eq(timesheets.venueId, venueId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async getBaselineByShiftId(tx: RlsTx, shiftId: string) {
    const rows = await tx.select().from(timesheets).where(eq(timesheets.shiftId, shiftId)).limit(1);
    return rows[0] ?? null;
  },

  async insertBaseline(tx: RlsTx, row: typeof timesheets.$inferInsert) {
    await tx.insert(timesheets).values(row).onConflictDoNothing({ target: timesheets.shiftId });
  },

  async insertEntry(tx: RlsTx, row: typeof timesheets.$inferInsert) {
    const inserted = await tx.insert(timesheets).values(row).returning();
    return inserted[0]!;
  },

  async updateEntry(tx: RlsTx, timesheetId: string, patch: Partial<typeof timesheets.$inferInsert>) {
    const updated = await tx
      .update(timesheets)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(timesheets.id, timesheetId))
      .returning();
    return updated[0] ?? null;
  },

  async getActiveClock(tx: RlsTx, args: { venueId: string; userProfileId: string }) {
    const rows = await tx
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.venueId, args.venueId),
          eq(timesheets.userProfileId, args.userProfileId),
          eq(timesheets.status, "open"),
          sql`${timesheets.actualStartsAt} IS NOT NULL`,
          sql`${timesheets.actualEndsAt} IS NULL`,
        ),
      )
      .orderBy(desc(timesheets.actualStartsAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async findOpenShiftForUser(
    tx: RlsTx,
    args: { venueId: string; userProfileId: string; workDate: string },
  ) {
    const rows = await tx
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.venueId, args.venueId),
          eq(timesheets.userProfileId, args.userProfileId),
          eq(timesheets.workDate, args.workDate),
          eq(timesheets.status, "open"),
          sql`${timesheets.actualStartsAt} IS NULL`,
        ),
      )
      .orderBy(asc(timesheets.rosteredStartsAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertClockEvent(tx: RlsTx, row: typeof timesheetClockEvents.$inferInsert) {
    const inserted = await tx.insert(timesheetClockEvents).values(row).returning();
    return inserted[0]!;
  },

  async listClockEvents(tx: RlsTx, timesheetId: string) {
    return tx
      .select()
      .from(timesheetClockEvents)
      .where(eq(timesheetClockEvents.timesheetId, timesheetId))
      .orderBy(asc(timesheetClockEvents.eventAt));
  },

  async insertAudit(tx: RlsTx, row: typeof timesheetAuditLog.$inferInsert) {
    await tx.insert(timesheetAuditLog).values(row);
  },

  async insertDispute(tx: RlsTx, row: typeof timesheetDisputes.$inferInsert) {
    const inserted = await tx.insert(timesheetDisputes).values(row).returning();
    return inserted[0]!;
  },

  async getPendingDispute(tx: RlsTx, timesheetId: string) {
    const rows = await tx
      .select()
      .from(timesheetDisputes)
      .where(
        and(eq(timesheetDisputes.timesheetId, timesheetId), eq(timesheetDisputes.resolution, "pending")),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async resolveDispute(
    tx: RlsTx,
    disputeId: string,
    patch: {
      resolution: "accepted" | "partial" | "rejected";
      resolutionNotes?: string;
      resolvedBy: string;
    },
  ) {
    const updated = await tx
      .update(timesheetDisputes)
      .set({
        resolution: patch.resolution,
        resolutionNotes: patch.resolutionNotes ?? null,
        resolvedBy: patch.resolvedBy,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(timesheetDisputes.id, disputeId))
      .returning();
    return updated[0] ?? null;
  },

  async insertPayrollLine(tx: RlsTx, row: typeof payrollTimesheetLines.$inferInsert) {
    await tx
      .insert(payrollTimesheetLines)
      .values(row)
      .onConflictDoNothing({ target: payrollTimesheetLines.timesheetId });
  },

  async getStaffNames(tx: RlsTx, userProfileIds: string[]) {
    if (userProfileIds.length === 0) return new Map<string, string>();
    const rows = await tx
      .select({
        id: userProfiles.id,
        fullName: userProfiles.fullName,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.id, userProfileIds));
    const map = new Map<string, string>();
    for (const r of rows) {
      const name =
        r.fullName?.trim() ||
        [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
        "Staff member";
      map.set(r.id, name);
    }
    return map;
  },

  async listOpenForAutoClockOut(tx: RlsTx, nowIso: string) {
    return tx
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.status, "open"),
          sql`${timesheets.actualStartsAt} IS NOT NULL`,
          sql`${timesheets.actualEndsAt} IS NULL`,
          lte(timesheets.rosteredEndsAt, nowIso),
        ),
      );
  },

  async submitOpenEntriesForPeriod(tx: RlsTx, payPeriodId: string) {
    return tx
      .update(timesheets)
      .set({ status: "submitted", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(and(eq(timesheets.payPeriodId, payPeriodId), eq(timesheets.status, "open")))
      .returning({ id: timesheets.id });
  },

  async getShiftById(tx: RlsTx, shiftId: string) {
    const rows = await tx.select().from(rosterShifts).where(eq(rosterShifts.id, shiftId)).limit(1);
    return rows[0] ?? null;
  },

  async sumWeeklyHours(
    tx: RlsTx,
    args: { userProfileId: string; organisationId: string; weekStart: string; weekEnd: string },
  ) {
    const rows = await tx
      .select({ total: sql<string>`coalesce(sum(${timesheets.actualHours}), 0)` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.organisationId, args.organisationId),
          eq(timesheets.userProfileId, args.userProfileId),
          gte(timesheets.workDate, args.weekStart),
          lte(timesheets.workDate, args.weekEnd),
          or(eq(timesheets.status, "approved"), eq(timesheets.status, "submitted")),
        ),
      );
    return num(rows[0]?.total);
  },
};
