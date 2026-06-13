import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  roles,
  userOrganisations,
  userProfiles,
  userVenues,
  venues,
} from "@/server/db/schema";

export const organisationMembersRepo = {
  async listActiveMembers(tx: RlsTx, organisationId: string) {
    return tx
      .select({
        id: userOrganisations.id,
        userProfileId: userOrganisations.userProfileId,
        roleId: userOrganisations.roleId,
      })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.organisationId, organisationId),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      );
  },

  async listAllMembers(tx: RlsTx, organisationId: string) {
    return tx
      .select({
        id: userOrganisations.id,
        userProfileId: userOrganisations.userProfileId,
        roleId: userOrganisations.roleId,
        isActive: userOrganisations.isActive,
        archivedAt: userOrganisations.archivedAt,
      })
      .from(userOrganisations)
      .where(eq(userOrganisations.organisationId, organisationId));
  },

  async listVenueAssignmentsForMembers(
    tx: RlsTx,
    args: { organisationId: string; userOrganisationIds: string[] },
  ) {
    if (args.userOrganisationIds.length === 0) return [];
    return tx
      .select({
        userOrganisationId: userVenues.userOrganisationId,
        venueId: userVenues.venueId,
        venueName: venues.name,
        isActive: userVenues.isActive,
        archivedAt: userVenues.archivedAt,
      })
      .from(userVenues)
      .innerJoin(venues, eq(venues.id, userVenues.venueId))
      .where(
        and(
          eq(userVenues.organisationId, args.organisationId),
          inArray(userVenues.userOrganisationId, args.userOrganisationIds),
        ),
      );
  },

  async archiveMembership(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      organisationId: string;
      updatedAt: string;
    },
  ) {
    await tx
      .update(userOrganisations)
      .set({
        isActive: false,
        archivedAt: args.updatedAt,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(userOrganisations.id, args.userOrganisationId),
          eq(userOrganisations.organisationId, args.organisationId),
        ),
      );
  },

  async archiveVenuesForMember(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      organisationId: string;
      updatedAt: string;
    },
  ) {
    await tx
      .update(userVenues)
      .set({
        isActive: false,
        archivedAt: args.updatedAt,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(userVenues.userOrganisationId, args.userOrganisationId),
          eq(userVenues.organisationId, args.organisationId),
          isNull(userVenues.archivedAt),
        ),
      );
  },

  async reactivateVenuesForMember(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      organisationId: string;
      venueIds: string[];
      updatedAt: string;
    },
  ) {
    for (const venueId of args.venueIds) {
      const existing = await tx
        .select({ id: userVenues.id })
        .from(userVenues)
        .where(
          and(
            eq(userVenues.userOrganisationId, args.userOrganisationId),
            eq(userVenues.venueId, venueId),
            eq(userVenues.organisationId, args.organisationId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await tx
          .update(userVenues)
          .set({
            isActive: true,
            archivedAt: null,
            updatedAt: args.updatedAt,
          })
          .where(eq(userVenues.id, existing[0].id));
      } else {
        await tx.insert(userVenues).values({
          userOrganisationId: args.userOrganisationId,
          organisationId: args.organisationId,
          venueId,
          isActive: true,
        });
      }
    }
  },

  async replaceVenueAssignments(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      organisationId: string;
      venueIds: string[];
      updatedAt: string;
    },
  ) {
    const activeRows = await tx
      .select({ venueId: userVenues.venueId, id: userVenues.id })
      .from(userVenues)
      .where(
        and(
          eq(userVenues.userOrganisationId, args.userOrganisationId),
          eq(userVenues.organisationId, args.organisationId),
          isNull(userVenues.archivedAt),
          eq(userVenues.isActive, true),
        ),
      );

    const target = new Set(args.venueIds);
    for (const row of activeRows) {
      if (!target.has(row.venueId)) {
        await tx
          .update(userVenues)
          .set({
            isActive: false,
            archivedAt: args.updatedAt,
            updatedAt: args.updatedAt,
          })
          .where(eq(userVenues.id, row.id));
      }
    }

    for (const venueId of args.venueIds) {
      const existing = await tx
        .select({ id: userVenues.id, archivedAt: userVenues.archivedAt })
        .from(userVenues)
        .where(
          and(
            eq(userVenues.userOrganisationId, args.userOrganisationId),
            eq(userVenues.venueId, venueId),
            eq(userVenues.organisationId, args.organisationId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await tx
          .update(userVenues)
          .set({
            isActive: true,
            archivedAt: null,
            updatedAt: args.updatedAt,
          })
          .where(eq(userVenues.id, existing[0].id));
      } else {
        await tx.insert(userVenues).values({
          userOrganisationId: args.userOrganisationId,
          organisationId: args.organisationId,
          venueId,
          isActive: true,
        });
      }
    }
  },

  async getMembershipDetail(tx: RlsTx, userOrganisationId: string) {
    const rows = await tx
      .select({
        id: userOrganisations.id,
        userProfileId: userOrganisations.userProfileId,
        roleId: userOrganisations.roleId,
        organisationId: userOrganisations.organisationId,
        isActive: userOrganisations.isActive,
        archivedAt: userOrganisations.archivedAt,
      })
      .from(userOrganisations)
      .where(eq(userOrganisations.id, userOrganisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findActiveMembershipByProfile(
    tx: RlsTx,
    args: { userProfileId: string; organisationId: string },
  ) {
    const rows = await tx
      .select({ id: userOrganisations.id })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, args.userProfileId),
          eq(userOrganisations.organisationId, args.organisationId),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async listProfilesByIds(
    tx: RlsTx,
    profileIds: string[],
  ): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      fullName: string | null;
    }>
  > {
    if (profileIds.length === 0) return [];
    return tx
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        fullName: userProfiles.fullName,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.id, profileIds));
  },

  async listRolesByIds(
    tx: RlsTx,
    roleIds: string[],
  ): Promise<
    Array<{
      id: string;
      slug: string;
      displayName: string;
      grantsOrgAdmin: boolean;
    }>
  > {
    if (roleIds.length === 0) return [];
    return tx
      .select({
        id: roles.id,
        slug: roles.slug,
        displayName: roles.displayName,
        grantsOrgAdmin: roles.grantsOrgAdmin,
      })
      .from(roles)
      .where(inArray(roles.id, roleIds));
  },

  async getMembership(tx: RlsTx, userOrganisationId: string) {
    const rows = await tx
      .select({
        id: userOrganisations.id,
        roleId: userOrganisations.roleId,
        organisationId: userOrganisations.organisationId,
      })
      .from(userOrganisations)
      .where(eq(userOrganisations.id, userOrganisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async countActiveOwners(
    tx: RlsTx,
    args: { organisationId: string; ownerRoleId: string },
  ): Promise<number> {
    const rows = await tx
      .select({ value: count() })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.organisationId, args.organisationId),
          eq(userOrganisations.roleId, args.ownerRoleId),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      );
    return Number(rows[0]?.value ?? 0);
  },

  async updateMembershipRole(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      organisationId: string;
      roleId: string;
      updatedAt: string;
    },
  ) {
    await tx
      .update(userOrganisations)
      .set({
        roleId: args.roleId,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(userOrganisations.id, args.userOrganisationId),
          eq(userOrganisations.organisationId, args.organisationId),
        ),
      );
  },

  async findLatestMembershipByProfile(
    tx: RlsTx,
    args: { userProfileId: string; organisationId: string },
  ) {
    const rows = await tx
      .select({
        id: userOrganisations.id,
        archivedAt: userOrganisations.archivedAt,
        isActive: userOrganisations.isActive,
      })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, args.userProfileId),
          eq(userOrganisations.organisationId, args.organisationId),
        ),
      )
      .orderBy(desc(userOrganisations.updatedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async reactivateMembership(
    tx: RlsTx,
    args: {
      id: string;
      organisationId: string;
      roleId: string;
      joinedAt: string;
      updatedAt: string;
    },
  ) {
    await tx
      .update(userOrganisations)
      .set({
        archivedAt: null,
        isActive: true,
        roleId: args.roleId,
        joinedAt: args.joinedAt,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(userOrganisations.id, args.id),
          eq(userOrganisations.organisationId, args.organisationId),
        ),
      );
  },

  async insertMembership(
    tx: RlsTx,
    row: typeof userOrganisations.$inferInsert,
  ) {
    await tx.insert(userOrganisations).values(row);
  },

  async findProfileIdByEmail(appDb: AppDb, email: string): Promise<string | null> {
    const rows = await appDb.admin
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.email, email))
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async updateProfileNames(
    appDb: AppDb,
    args: {
      profileId: string;
      firstName: string;
      lastName: string;
      fullName: string;
      updatedAt: string;
    },
  ) {
    await appDb.admin
      .update(userProfiles)
      .set({
        firstName: args.firstName,
        lastName: args.lastName,
        fullName: args.fullName,
        updatedAt: args.updatedAt,
      })
      .where(eq(userProfiles.id, args.profileId));
  },
};
