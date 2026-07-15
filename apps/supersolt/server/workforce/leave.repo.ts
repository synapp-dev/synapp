import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  leaveAccrualEvents,
  leaveAuditLog,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  lslStateRules,
  organisations,
  payrollLeaveLines,
  rosterShifts,
  userOrganisations,
  venues,
} from "@/server/db/schema";

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type LeaveTypeRow = typeof leaveTypes.$inferSelect;
export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type LeaveBalanceRow = typeof leaveBalances.$inferSelect;

export const leaveRepo = {
  async listLeaveTypes(tx: RlsTx, organisationId: string, includeArchived = false) {
    const conditions = [eq(leaveTypes.organisationId, organisationId)];
    if (!includeArchived) {
      conditions.push(eq(leaveTypes.isArchived, false));
    }
    return tx
      .select()
      .from(leaveTypes)
      .where(and(...conditions))
      .orderBy(asc(leaveTypes.name));
  },

  async getLeaveTypeById(tx: RlsTx, organisationId: string, leaveTypeId: string) {
    const rows = await tx
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.id, leaveTypeId), eq(leaveTypes.organisationId, organisationId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async getLeaveTypeByCode(tx: RlsTx, organisationId: string, code: string) {
    const rows = await tx
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.organisationId, organisationId), eq(leaveTypes.code, code)))
      .limit(1);
    return rows[0] ?? null;
  },

  async getOrgLeaveSettings(tx: RlsTx, organisationId: string) {
    const rows = await tx
      .select({ leaveOwnerApprovalMinDays: organisations.leaveOwnerApprovalMinDays })
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    return rows[0] ?? { leaveOwnerApprovalMinDays: 5 };
  },

  async getVenueState(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({ state: venues.state })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    return rows[0]?.state ?? "VIC";
  },

  async getEmploymentType(tx: RlsTx, organisationId: string, userProfileId: string) {
    const rows = await tx
      .select({
        employmentType: userOrganisations.employmentType,
        joinedAt: userOrganisations.joinedAt,
        createdAt: userOrganisations.createdAt,
      })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.organisationId, organisationId),
          eq(userOrganisations.userProfileId, userProfileId),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async listBalancesForUser(
    tx: RlsTx,
    args: { organisationId: string; userProfileId: string },
  ) {
    return tx
      .select({
        balance: leaveBalances,
        leaveType: leaveTypes,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
      .where(
        and(
          eq(leaveBalances.organisationId, args.organisationId),
          eq(leaveBalances.userProfileId, args.userProfileId),
        ),
      )
      .orderBy(asc(leaveTypes.name));
  },

  async ensureBalanceRow(
    tx: RlsTx,
    args: { organisationId: string; userProfileId: string; leaveTypeId: string },
  ) {
    const existing = await tx
      .select({ id: leaveBalances.id })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.organisationId, args.organisationId),
          eq(leaveBalances.userProfileId, args.userProfileId),
          eq(leaveBalances.leaveTypeId, args.leaveTypeId),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0].id;

    const inserted = await tx
      .insert(leaveBalances)
      .values({
        organisationId: args.organisationId,
        userProfileId: args.userProfileId,
        leaveTypeId: args.leaveTypeId,
        currentBalanceHours: "0",
        accruedLifetimeHours: "0",
        usedLifetimeHours: "0",
      })
      .returning({ id: leaveBalances.id });
    return inserted[0]!.id;
  },

  async adjustBalanceHours(
    tx: RlsTx,
    args: {
      balanceId: string;
      currentDelta: number;
      accruedDelta?: number;
      usedDelta?: number;
    },
  ) {
    const rows = await tx
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.id, args.balanceId))
      .limit(1);
    const row = rows[0];
    if (!row) return;

    const current = num(row.currentBalanceHours);
    const accrued = num(row.accruedLifetimeHours);
    const used = num(row.usedLifetimeHours);

    await tx
      .update(leaveBalances)
      .set({
        currentBalanceHours: String(Math.round((current + args.currentDelta) * 100) / 100),
        accruedLifetimeHours:
          args.accruedDelta != null
            ? String(Math.round((accrued + args.accruedDelta) * 100) / 100)
            : row.accruedLifetimeHours,
        usedLifetimeHours:
          args.usedDelta != null
            ? String(Math.round((used + args.usedDelta) * 100) / 100)
            : row.usedLifetimeHours,
        updatedAt: new Date().toISOString(),
        lastAccrualAt: args.accruedDelta != null ? new Date().toISOString() : row.lastAccrualAt,
      })
      .where(eq(leaveBalances.id, args.balanceId));
  },

  async listRequests(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId?: string;
      userProfileId?: string;
      status?: LeaveRequestRow["status"] | LeaveRequestRow["status"][];
      from?: string;
      to?: string;
    },
  ) {
    const conditions = [eq(leaveRequests.organisationId, args.organisationId)];
    if (args.venueId) conditions.push(eq(leaveRequests.venueId, args.venueId));
    if (args.userProfileId) conditions.push(eq(leaveRequests.userProfileId, args.userProfileId));
    if (args.status) {
      if (Array.isArray(args.status)) {
        conditions.push(inArray(leaveRequests.status, args.status));
      } else {
        conditions.push(eq(leaveRequests.status, args.status));
      }
    }
    if (args.from) conditions.push(gte(leaveRequests.endDate, args.from));
    if (args.to) conditions.push(lte(leaveRequests.startDate, args.to));

    return tx
      .select({
        request: leaveRequests,
        leaveType: leaveTypes,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.requestedAt));
  },

  async getRequestById(tx: RlsTx, requestId: string) {
    const rows = await tx
      .select({
        request: leaveRequests,
        leaveType: leaveTypes,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .where(eq(leaveRequests.id, requestId))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertRequest(tx: RlsTx, row: typeof leaveRequests.$inferInsert) {
    const inserted = await tx.insert(leaveRequests).values(row).returning();
    return inserted[0]!;
  },

  async updateRequest(
    tx: RlsTx,
    requestId: string,
    patch: Partial<typeof leaveRequests.$inferInsert>,
  ) {
    const updated = await tx
      .update(leaveRequests)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(leaveRequests.id, requestId))
      .returning();
    return updated[0] ?? null;
  },

  async insertAudit(
    tx: RlsTx,
    row: typeof leaveAuditLog.$inferInsert,
  ) {
    await tx.insert(leaveAuditLog).values(row);
  },

  async listApprovedLeaveRanges(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId?: string;
      userProfileIds?: string[];
      from: string;
      to: string;
    },
  ) {
    const conditions = [
      eq(leaveRequests.organisationId, args.organisationId),
      eq(leaveRequests.status, "approved"),
      lte(leaveRequests.startDate, args.to),
      gte(leaveRequests.endDate, args.from),
    ];
    if (args.venueId) conditions.push(eq(leaveRequests.venueId, args.venueId));
    if (args.userProfileIds?.length) {
      conditions.push(inArray(leaveRequests.userProfileId, args.userProfileIds));
    }

    return tx
      .select({
        userProfileId: leaveRequests.userProfileId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        requestId: leaveRequests.id,
      })
      .from(leaveRequests)
      .where(and(...conditions));
  },

  async countTeamApprovedOverlap(
    tx: RlsTx,
    args: {
      venueId: string;
      startDate: string;
      endDate: string;
      excludeUserProfileId?: string;
    },
  ) {
    const conditions = [
      eq(leaveRequests.venueId, args.venueId),
      eq(leaveRequests.status, "approved"),
      lte(leaveRequests.startDate, args.endDate),
      gte(leaveRequests.endDate, args.startDate),
    ];
    if (args.excludeUserProfileId) {
      conditions.push(ne(leaveRequests.userProfileId, args.excludeUserProfileId));
    }
    const rows = await tx
      .select({ count: sql<number>`count(distinct ${leaveRequests.userProfileId})::int` })
      .from(leaveRequests)
      .where(and(...conditions));
    return rows[0]?.count ?? 0;
  },

  async listShiftsForStaffInDateRange(
    tx: RlsTx,
    args: {
      venueId: string;
      userProfileId: string;
      startDate: string;
      endDate: string;
    },
  ) {
    return tx
      .select({
        id: rosterShifts.id,
        startsAt: rosterShifts.startsAt,
        endsAt: rosterShifts.endsAt,
      })
      .from(rosterShifts)
      .where(
        and(
          eq(rosterShifts.venueId, args.venueId),
          eq(rosterShifts.userProfileId, args.userProfileId),
          gte(rosterShifts.startsAt, `${args.startDate}T00:00:00.000Z`),
          lte(rosterShifts.startsAt, `${args.endDate}T23:59:59.999Z`),
        ),
      );
  },

  async unassignShifts(tx: RlsTx, shiftIds: string[]) {
    if (shiftIds.length === 0) return;
    await tx
      .update(rosterShifts)
      .set({ userProfileId: null, updatedAt: new Date().toISOString() })
      .where(inArray(rosterShifts.id, shiftIds));
  },

  async insertAccrualEvent(tx: RlsTx, row: typeof leaveAccrualEvents.$inferInsert) {
    const inserted = await tx.insert(leaveAccrualEvents).values(row).returning();
    return inserted[0]!;
  },

  async accrualEventExists(
    tx: RlsTx,
    args: { organisationId: string; sourceRef: string; triggeredBy: "timesheet_approval" },
  ) {
    const rows = await tx
      .select({ id: leaveAccrualEvents.id })
      .from(leaveAccrualEvents)
      .where(
        and(
          eq(leaveAccrualEvents.organisationId, args.organisationId),
          eq(leaveAccrualEvents.sourceRef, args.sourceRef),
          eq(leaveAccrualEvents.triggeredBy, args.triggeredBy),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async insertPayrollLeaveLine(tx: RlsTx, row: typeof payrollLeaveLines.$inferInsert) {
    await tx.insert(payrollLeaveLines).values(row);
  },

  async getLslRule(tx: RlsTx, state: string) {
    const normalized = state.trim().toUpperCase();
    const rows = await tx
      .select()
      .from(lslStateRules)
      .where(eq(lslStateRules.state, normalized))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertLeaveType(
    tx: RlsTx,
    organisationId: string,
    typeId: string | null,
    values: Partial<typeof leaveTypes.$inferInsert>,
  ) {
    if (typeId) {
      const updated = await tx
        .update(leaveTypes)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(and(eq(leaveTypes.id, typeId), eq(leaveTypes.organisationId, organisationId)))
        .returning();
      return updated[0] ?? null;
    }
    const inserted = await tx
      .insert(leaveTypes)
      .values({ organisationId, ...values } as typeof leaveTypes.$inferInsert)
      .returning();
    return inserted[0] ?? null;
  },
};
