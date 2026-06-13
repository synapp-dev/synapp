import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  employeePayrollProfiles,
  organisations,
  roles,
  userOrganisations,
  userProfiles,
  userVenues,
  venues,
} from "@/server/db/schema";

export const peopleRepo = {
  async getOrganisationIdBySlug(tx: RlsTx, slug: string) {
    const rows = await tx
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.slug, slug))
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async listMembershipsForOrganisation(
    tx: RlsTx,
    args: { organisationId: string; venueId?: string },
  ) {
    const base = and(
      eq(userOrganisations.organisationId, args.organisationId),
      eq(userOrganisations.isActive, true),
      isNull(userOrganisations.archivedAt),
    );

    if (args.venueId) {
      return tx
        .select({
          userOrganisationId: userOrganisations.id,
          userProfileId: userOrganisations.userProfileId,
          roleId: userOrganisations.roleId,
          employmentType: userOrganisations.employmentType,
          employmentStatus: userOrganisations.employmentStatus,
          startDate: userOrganisations.startDate,
          payRateCents: userOrganisations.payRateCents,
          awardCode: userOrganisations.awardCode,
          needsSupersoltDetail: userOrganisations.needsSupersoltDetail,
          fwisIssuedDate: userOrganisations.fwisIssuedDate,
          ceisIssuedDate: userOrganisations.ceisIssuedDate,
          joinedAt: userOrganisations.joinedAt,
          createdAt: userOrganisations.createdAt,
          defaultPositionId: userVenues.defaultPositionId,
          venueRoleId: userVenues.roleId,
        })
        .from(userVenues)
        .innerJoin(
          userOrganisations,
          eq(userVenues.userOrganisationId, userOrganisations.id),
        )
        .where(
          and(
            base,
            eq(userVenues.venueId, args.venueId),
            eq(userVenues.isActive, true),
            isNull(userVenues.archivedAt),
          ),
        );
    }

    return tx
      .select({
        userOrganisationId: userOrganisations.id,
        userProfileId: userOrganisations.userProfileId,
        roleId: userOrganisations.roleId,
        employmentType: userOrganisations.employmentType,
        employmentStatus: userOrganisations.employmentStatus,
        startDate: userOrganisations.startDate,
        payRateCents: userOrganisations.payRateCents,
        awardCode: userOrganisations.awardCode,
        needsSupersoltDetail: userOrganisations.needsSupersoltDetail,
        fwisIssuedDate: userOrganisations.fwisIssuedDate,
        ceisIssuedDate: userOrganisations.ceisIssuedDate,
        joinedAt: userOrganisations.joinedAt,
        createdAt: userOrganisations.createdAt,
        defaultPositionId: sql<string | null>`null`,
        venueRoleId: sql<string | null>`null`,
      })
      .from(userOrganisations)
      .where(base);
  },

  async getMembershipById(tx: RlsTx, userOrganisationId: string) {
    const rows = await tx
      .select()
      .from(userOrganisations)
      .where(eq(userOrganisations.id, userOrganisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getProfile(tx: RlsTx, userProfileId: string) {
    const rows = await tx
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findProfileIdByEmail(tx: RlsTx, email: string) {
    const rows = await tx
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(sql`lower(trim(${userProfiles.email}))`, email.toLowerCase()))
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async getPayrollProfile(
    tx: RlsTx,
    args: { organisationId: string; userProfileId: string },
  ) {
    const rows = await tx
      .select()
      .from(employeePayrollProfiles)
      .where(
        and(
          eq(employeePayrollProfiles.organisationId, args.organisationId),
          eq(employeePayrollProfiles.userProfileId, args.userProfileId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertPayrollProfileShell(
    tx: RlsTx,
    args: { organisationId: string; userProfileId: string },
  ) {
    await tx
      .insert(employeePayrollProfiles)
      .values({
        organisationId: args.organisationId,
        userProfileId: args.userProfileId,
      })
      .onConflictDoNothing();
  },

  async listRolesByIds(tx: RlsTx, ids: string[]) {
    if (ids.length === 0) return [];
    return tx.select().from(roles).where(inArray(roles.id, ids));
  },

  async listVenueIdsForMember(tx: RlsTx, userOrganisationId: string) {
    return tx
      .select({ venueId: userVenues.venueId })
      .from(userVenues)
      .where(
        and(
          eq(userVenues.userOrganisationId, userOrganisationId),
          eq(userVenues.isActive, true),
          isNull(userVenues.archivedAt),
        ),
      );
  },
};
