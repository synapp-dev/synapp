import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  positions,
  roles,
  rosterPublishDeliveries,
  rosterShifts,
  rosterWeeks,
  shiftComplianceFlags,
  timesheets,
  userOrganisations,
  userProfiles,
  userVenues,
  venueStaffWeekInstanceAvailability,
  venueStaffWeeklyAvailability,
} from "@/server/db/schema";

export type WorkforceRoleRow = {
  id: string;
  slug: string;
  displayName: string;
  grantsOrgAdmin: boolean;
};

export type WorkforceProfileRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  archivedAt: string | null;
};

export const workforceRepo = {
  async listActiveUserVenuesForVenue(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ) {
    return tx
      .select({
        userOrganisationId: userVenues.userOrganisationId,
        roleId: userVenues.roleId,
        defaultPositionId: userVenues.defaultPositionId,
      })
      .from(userVenues)
      .where(
        and(
          eq(userVenues.organisationId, args.organisationId),
          eq(userVenues.venueId, args.venueId),
          eq(userVenues.isActive, true),
          isNull(userVenues.archivedAt),
        ),
      );
  },

  async listUserOrganisationsByIds(tx: RlsTx, ids: string[]) {
    if (ids.length === 0) return [];
    return tx
      .select({
        id: userOrganisations.id,
        roleId: userOrganisations.roleId,
        userProfileId: userOrganisations.userProfileId,
        joinedAt: userOrganisations.joinedAt,
        createdAt: userOrganisations.createdAt,
        isActive: userOrganisations.isActive,
        archivedAt: userOrganisations.archivedAt,
      })
      .from(userOrganisations)
      .where(
        and(
          inArray(userOrganisations.id, ids),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      );
  },

  async listProfilesByIds(tx: RlsTx, ids: string[]): Promise<WorkforceProfileRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        fullName: userProfiles.fullName,
        phone: userProfiles.phone,
        isActive: userProfiles.isActive,
        archivedAt: userProfiles.archivedAt,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.id, ids));
  },

  async listRolesByIds(tx: RlsTx, ids: string[]): Promise<WorkforceRoleRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select({
        id: roles.id,
        slug: roles.slug,
        displayName: roles.displayName,
        grantsOrgAdmin: roles.grantsOrgAdmin,
      })
      .from(roles)
      .where(inArray(roles.id, ids));
  },

  async listPositionsByIds(
    tx: RlsTx,
    ids: string[],
  ): Promise<Array<{ id: string; slug: string; displayName: string }>> {
    if (ids.length === 0) return [];
    return tx
      .select({
        id: positions.id,
        slug: positions.slug,
        displayName: positions.displayName,
      })
      .from(positions)
      .where(inArray(positions.id, ids));
  },

  async listPositionsForVenue(tx: RlsTx, venueId: string) {
    return tx
      .select({
        id: positions.id,
        slug: positions.slug,
        displayName: positions.displayName,
        sortOrder: positions.sortOrder,
      })
      .from(positions)
      .where(and(eq(positions.venueId, venueId), isNull(positions.archivedAt)))
      .orderBy(asc(positions.sortOrder));
  },

  async listWeeklyAvailability(tx: RlsTx, venueId: string, staffIds: string[]) {
    if (staffIds.length === 0) return [];
    return tx
      .select({
        userProfileId: venueStaffWeeklyAvailability.userProfileId,
        dayOfWeek: venueStaffWeeklyAvailability.dayOfWeek,
        isAvailable: venueStaffWeeklyAvailability.isAvailable,
        availableStartTime: venueStaffWeeklyAvailability.availableStartTime,
        availableEndTime: venueStaffWeeklyAvailability.availableEndTime,
      })
      .from(venueStaffWeeklyAvailability)
      .where(
        and(
          eq(venueStaffWeeklyAvailability.venueId, venueId),
          inArray(venueStaffWeeklyAvailability.userProfileId, staffIds),
        ),
      );
  },

  async listWeekInstanceAvailability(
    tx: RlsTx,
    args: { venueId: string; weekStartMonday: string; staffIds: string[] },
  ) {
    if (args.staffIds.length === 0) return [];
    return tx
      .select({
        userProfileId: venueStaffWeekInstanceAvailability.userProfileId,
        dayOfWeek: venueStaffWeekInstanceAvailability.dayOfWeek,
        isAvailable: venueStaffWeekInstanceAvailability.isAvailable,
        weekStartMonday: venueStaffWeekInstanceAvailability.weekStartMonday,
        availableStartTime: venueStaffWeekInstanceAvailability.availableStartTime,
        availableEndTime: venueStaffWeekInstanceAvailability.availableEndTime,
      })
      .from(venueStaffWeekInstanceAvailability)
      .where(
        and(
          eq(venueStaffWeekInstanceAvailability.venueId, args.venueId),
          eq(
            venueStaffWeekInstanceAvailability.weekStartMonday,
            args.weekStartMonday,
          ),
          inArray(
            venueStaffWeekInstanceAvailability.userProfileId,
            args.staffIds,
          ),
        ),
      );
  },

  async deleteWeekInstanceAvailabilityCell(
    tx: RlsTx,
    args: {
      venueId: string;
      userProfileId: string;
      weekStartMonday: string;
      dayOfWeek: number;
    },
  ) {
    await tx
      .delete(venueStaffWeekInstanceAvailability)
      .where(
        and(
          eq(venueStaffWeekInstanceAvailability.venueId, args.venueId),
          eq(
            venueStaffWeekInstanceAvailability.userProfileId,
            args.userProfileId,
          ),
          eq(
            venueStaffWeekInstanceAvailability.weekStartMonday,
            args.weekStartMonday,
          ),
          eq(venueStaffWeekInstanceAvailability.dayOfWeek, args.dayOfWeek),
        ),
      );
  },

  async upsertWeekInstanceAvailabilityCell(
    tx: RlsTx,
    row: typeof venueStaffWeekInstanceAvailability.$inferInsert,
  ) {
    await tx
      .insert(venueStaffWeekInstanceAvailability)
      .values(row)
      .onConflictDoUpdate({
        target: [
          venueStaffWeekInstanceAvailability.venueId,
          venueStaffWeekInstanceAvailability.userProfileId,
          venueStaffWeekInstanceAvailability.weekStartMonday,
          venueStaffWeekInstanceAvailability.dayOfWeek,
        ],
        set: {
          isAvailable: row.isAvailable,
          availableStartTime: row.availableStartTime,
          availableEndTime: row.availableEndTime,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async deleteWeeklyAvailabilityCell(
    tx: RlsTx,
    args: { venueId: string; userProfileId: string; dayOfWeek: number },
  ) {
    await tx
      .delete(venueStaffWeeklyAvailability)
      .where(
        and(
          eq(venueStaffWeeklyAvailability.venueId, args.venueId),
          eq(venueStaffWeeklyAvailability.userProfileId, args.userProfileId),
          eq(venueStaffWeeklyAvailability.dayOfWeek, args.dayOfWeek),
        ),
      );
  },

  async upsertWeeklyAvailabilityCell(
    tx: RlsTx,
    row: typeof venueStaffWeeklyAvailability.$inferInsert,
  ) {
    await tx
      .insert(venueStaffWeeklyAvailability)
      .values(row)
      .onConflictDoUpdate({
        target: [
          venueStaffWeeklyAvailability.venueId,
          venueStaffWeeklyAvailability.userProfileId,
          venueStaffWeeklyAvailability.dayOfWeek,
        ],
        set: {
          isAvailable: row.isAvailable,
          availableStartTime: row.availableStartTime,
          availableEndTime: row.availableEndTime,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async listWeekInstanceAvailabilityForWeek(
    tx: RlsTx,
    args: { venueId: string; weekStartMonday: string },
  ) {
    return tx
      .select({
        userProfileId: venueStaffWeekInstanceAvailability.userProfileId,
        dayOfWeek: venueStaffWeekInstanceAvailability.dayOfWeek,
        isAvailable: venueStaffWeekInstanceAvailability.isAvailable,
        availableStartTime: venueStaffWeekInstanceAvailability.availableStartTime,
        availableEndTime: venueStaffWeekInstanceAvailability.availableEndTime,
      })
      .from(venueStaffWeekInstanceAvailability)
      .where(
        and(
          eq(venueStaffWeekInstanceAvailability.venueId, args.venueId),
          eq(
            venueStaffWeekInstanceAvailability.weekStartMonday,
            args.weekStartMonday,
          ),
        ),
      );
  },

  async bulkUpsertWeekInstanceAvailability(
    tx: RlsTx,
    rows: Array<typeof venueStaffWeekInstanceAvailability.$inferInsert>,
  ) {
    if (rows.length === 0) return;
    await tx
      .insert(venueStaffWeekInstanceAvailability)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          venueStaffWeekInstanceAvailability.venueId,
          venueStaffWeekInstanceAvailability.userProfileId,
          venueStaffWeekInstanceAvailability.weekStartMonday,
          venueStaffWeekInstanceAvailability.dayOfWeek,
        ],
        set: {
          isAvailable: sql`excluded.is_available`,
          availableStartTime: sql`excluded.available_start_time`,
          availableEndTime: sql`excluded.available_end_time`,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async listAvailabilityHintsForWeek(
    tx: RlsTx,
    args: { venueId: string; weekStartMonday: string; staffIds: string[] },
  ) {
    const [instRows, recRows] = await Promise.all([
      args.staffIds.length > 0
        ? tx
            .select({
              userProfileId: venueStaffWeekInstanceAvailability.userProfileId,
              dayOfWeek: venueStaffWeekInstanceAvailability.dayOfWeek,
              isAvailable: venueStaffWeekInstanceAvailability.isAvailable,
            })
            .from(venueStaffWeekInstanceAvailability)
            .where(
              and(
                eq(venueStaffWeekInstanceAvailability.venueId, args.venueId),
                eq(
                  venueStaffWeekInstanceAvailability.weekStartMonday,
                  args.weekStartMonday,
                ),
                inArray(
                  venueStaffWeekInstanceAvailability.userProfileId,
                  args.staffIds,
                ),
              ),
            )
        : Promise.resolve([]),
      args.staffIds.length > 0
        ? tx
            .select({
              userProfileId: venueStaffWeeklyAvailability.userProfileId,
              dayOfWeek: venueStaffWeeklyAvailability.dayOfWeek,
              isAvailable: venueStaffWeeklyAvailability.isAvailable,
            })
            .from(venueStaffWeeklyAvailability)
            .where(
              and(
                eq(venueStaffWeeklyAvailability.venueId, args.venueId),
                inArray(venueStaffWeeklyAvailability.userProfileId, args.staffIds),
              ),
            )
        : Promise.resolve([]),
    ]);

    return { instRows, recRows };
  },

  async listShiftsInRange(
    tx: RlsTx,
    args: {
      venueId: string;
      startUtc: string;
      endExclusiveUtc: string;
      lifecycle?: "published" | "draft" | "all";
    },
  ) {
    const conditions = [
      eq(rosterShifts.venueId, args.venueId),
      lt(rosterShifts.startsAt, args.endExclusiveUtc),
      gt(rosterShifts.endsAt, args.startUtc),
    ];

    if (args.lifecycle === "published") {
      conditions.push(eq(rosterShifts.lifecycle, "published"));
    } else if (args.lifecycle === "draft") {
      conditions.push(eq(rosterShifts.lifecycle, "draft"));
    }

    return tx
      .select({
        id: rosterShifts.id,
        userProfileId: rosterShifts.userProfileId,
        startsAt: rosterShifts.startsAt,
        endsAt: rosterShifts.endsAt,
        breakMinutes: rosterShifts.breakMinutes,
        positionId: rosterShifts.positionId,
        lifecycle: rosterShifts.lifecycle,
        source: rosterShifts.source,
        awardCode: rosterShifts.awardCode,
        computedCostCents: rosterShifts.computedCostCents,
        baseCostCents: rosterShifts.baseCostCents,
        penaltyCostCents: rosterShifts.penaltyCostCents,
        rosterWeekId: rosterShifts.rosterWeekId,
      })
      .from(rosterShifts)
      .where(and(...conditions));
  },

  async listShiftsForStaffInRange(
    tx: RlsTx,
    args: {
      venueId: string;
      staffId: string;
      startUtc: string;
      endExclusiveUtc: string;
      excludeShiftId?: string;
    },
  ) {
    const conditions = [
      eq(rosterShifts.venueId, args.venueId),
      eq(rosterShifts.userProfileId, args.staffId),
      lt(rosterShifts.startsAt, args.endExclusiveUtc),
      gt(rosterShifts.endsAt, args.startUtc),
    ];
    if (args.excludeShiftId) {
      conditions.push(ne(rosterShifts.id, args.excludeShiftId));
    }
    return tx
      .select({
        id: rosterShifts.id,
        startsAt: rosterShifts.startsAt,
        endsAt: rosterShifts.endsAt,
      })
      .from(rosterShifts)
      .where(and(...conditions));
  },

  async findOverlappingShift(
    tx: RlsTx,
    args: {
      venueId: string;
      userProfileId: string | null;
      dayStartUtc: string;
      dayEndExclusiveUtc: string;
      excludeShiftId?: string;
    },
  ) {
    if (!args.userProfileId) {
      return null;
    }
    const conditions = [
      eq(rosterShifts.venueId, args.venueId),
      eq(rosterShifts.userProfileId, args.userProfileId),
      lt(rosterShifts.startsAt, args.dayEndExclusiveUtc),
      gt(rosterShifts.endsAt, args.dayStartUtc),
    ];

    if (args.excludeShiftId) {
      conditions.push(ne(rosterShifts.id, args.excludeShiftId));
    }

    const rows = await tx
      .select({ id: rosterShifts.id })
      .from(rosterShifts)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  },

  async insertShift(
    tx: RlsTx,
    row: typeof rosterShifts.$inferInsert,
  ): Promise<string> {
    const inserted = await tx
      .insert(rosterShifts)
      .values(row)
      .returning({ id: rosterShifts.id });
    const id = inserted[0]?.id;
    if (!id) {
      throw new Error("Insert failed");
    }
    return id;
  },

  async getShiftForVenue(tx: RlsTx, args: { shiftId: string; venueId: string }) {
    const rows = await tx
      .select()
      .from(rosterShifts)
      .where(
        and(
          eq(rosterShifts.id, args.shiftId),
          eq(rosterShifts.venueId, args.venueId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async deleteShift(tx: RlsTx, args: { shiftId: string; venueId: string }) {
    const deleted = await tx
      .delete(rosterShifts)
      .where(
        and(
          eq(rosterShifts.id, args.shiftId),
          eq(rosterShifts.venueId, args.venueId),
        ),
      )
      .returning({ id: rosterShifts.id });
    return deleted[0]?.id ?? null;
  },

  async getOrCreateRosterWeek(
    tx: RlsTx,
    row: typeof rosterWeeks.$inferInsert,
  ): Promise<string> {
    const existing = await tx
      .select({ id: rosterWeeks.id })
      .from(rosterWeeks)
      .where(
        and(
          eq(rosterWeeks.venueId, row.venueId),
          eq(rosterWeeks.weekStart, row.weekStart as string),
        ),
      )
      .limit(1);
    if (existing[0]?.id) {
      return existing[0].id;
    }
    const inserted = await tx
      .insert(rosterWeeks)
      .values(row)
      .returning({ id: rosterWeeks.id });
    const id = inserted[0]?.id;
    if (!id) throw new Error("Failed to create roster week");
    return id;
  },

  async updateRosterWeek(
    tx: RlsTx,
    args: {
      weekId: string;
      venueId: string;
      patch: Partial<typeof rosterWeeks.$inferInsert>;
    },
  ) {
    await tx
      .update(rosterWeeks)
      .set({ ...args.patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(rosterWeeks.id, args.weekId),
          eq(rosterWeeks.venueId, args.venueId),
        ),
      );
  },

  async getRosterWeek(
    tx: RlsTx,
    args: { venueId: string; weekStart: string },
  ) {
    const rows = await tx
      .select()
      .from(rosterWeeks)
      .where(
        and(
          eq(rosterWeeks.venueId, args.venueId),
          eq(rosterWeeks.weekStart, args.weekStart),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async replaceComplianceFlags(
    tx: RlsTx,
    args: {
      shiftId: string;
      flags: Array<{
        rule: (typeof shiftComplianceFlags.$inferInsert)["rule"];
        tier: (typeof shiftComplianceFlags.$inferInsert)["tier"];
        message: string;
        overridden: boolean;
        overrideReason?: string | null;
        overrideBy?: string | null;
        overrideAt?: string | null;
      }>;
    },
  ) {
    await tx
      .delete(shiftComplianceFlags)
      .where(eq(shiftComplianceFlags.shiftId, args.shiftId));
    if (args.flags.length === 0) return;
    await tx.insert(shiftComplianceFlags).values(
      args.flags.map((f) => ({
        shiftId: args.shiftId,
        rule: f.rule,
        tier: f.tier,
        message: f.message,
        overridden: f.overridden,
        overrideReason: f.overrideReason ?? null,
        overrideBy: f.overrideBy ?? null,
        overrideAt: f.overrideAt ?? null,
      })),
    );
  },

  async listComplianceFlagsForShifts(tx: RlsTx, shiftIds: string[]) {
    if (shiftIds.length === 0) return [];
    return tx
      .select()
      .from(shiftComplianceFlags)
      .where(inArray(shiftComplianceFlags.shiftId, shiftIds));
  },

  async insertTimesheetBaseline(
    tx: RlsTx,
    row: typeof timesheets.$inferInsert,
  ) {
    await tx
      .insert(timesheets)
      .values(row)
      .onConflictDoNothing({ target: timesheets.shiftId });
  },

  async queuePublishDelivery(
    tx: RlsTx,
    row: typeof rosterPublishDeliveries.$inferInsert,
  ) {
    await tx.insert(rosterPublishDeliveries).values(row);
  },

  async updateShift(
    tx: RlsTx,
    args: {
      shiftId: string;
      venueId: string;
      row: {
        userProfileId: string | null;
        positionId: string;
        startsAt: string;
        endsAt: string;
        breakMinutes: number;
        awardCode?: string | null;
        computedCostCents?: number | null;
        baseCostCents?: number | null;
        penaltyCostCents?: number | null;
        rosterWeekId?: string | null;
        lifecycle?: (typeof rosterShifts.$inferInsert)["lifecycle"];
      };
    },
  ): Promise<string | null> {
    const updated = await tx
      .update(rosterShifts)
      .set({
        userProfileId: args.row.userProfileId,
        positionId: args.row.positionId,
        startsAt: args.row.startsAt,
        endsAt: args.row.endsAt,
        breakMinutes: args.row.breakMinutes,
        awardCode: args.row.awardCode,
        computedCostCents: args.row.computedCostCents,
        baseCostCents: args.row.baseCostCents,
        penaltyCostCents: args.row.penaltyCostCents,
        rosterWeekId: args.row.rosterWeekId,
        lifecycle: args.row.lifecycle,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(rosterShifts.id, args.shiftId),
          eq(rosterShifts.venueId, args.venueId),
        ),
      )
      .returning({ id: rosterShifts.id });
    return updated[0]?.id ?? null;
  },
};
