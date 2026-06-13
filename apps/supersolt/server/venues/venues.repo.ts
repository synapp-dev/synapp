import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  organisations,
  roles,
  userOrganisations,
  userProfiles,
  userVenues,
  venues,
} from "@/server/db/schema";

export const venuesRepo = {
  async getOrganisationBySlug(
    tx: RlsTx,
    organisationSlug: string,
  ): Promise<{ id: string; slug: string } | null> {
    const rows = await tx
      .select({ id: organisations.id, slug: organisations.slug })
      .from(organisations)
      .where(
        and(
          eq(organisations.slug, organisationSlug),
          isNull(organisations.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async getVenueIdBySlug(
    tx: RlsTx,
    args: { organisationId: string; venueSlug: string },
  ): Promise<string | null> {
    const rows = await tx
      .select({ id: venues.id })
      .from(venues)
      .where(
        and(
          eq(venues.organisationId, args.organisationId),
          eq(venues.slug, args.venueSlug),
          eq(venues.isActive, true),
          isNull(venues.archivedAt),
        ),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async getOwnerMembership(
    tx: RlsTx,
    args: { userId: string; organisationId: string; ownerRoleId: string },
  ) {
    const rows = await tx
      .select({ id: userOrganisations.id, roleId: userOrganisations.roleId })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, args.userId),
          eq(userOrganisations.organisationId, args.organisationId),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row || row.roleId !== args.ownerRoleId) {
      return null;
    }
    return row;
  },

  async insertVenue(
    tx: RlsTx,
    row: typeof venues.$inferInsert,
  ): Promise<{ id: string; name: string; slug: string }> {
    const inserted = await tx
      .insert(venues)
      .values(row)
      .returning({ id: venues.id, name: venues.name, slug: venues.slug });
    const venue = inserted[0];
    if (!venue) {
      throw new Error("Failed to create venue");
    }
    return venue;
  },

  async insertUserVenue(tx: RlsTx, row: typeof userVenues.$inferInsert) {
    await tx.insert(userVenues).values(row);
  },

  async listActiveOrgMembers(tx: RlsTx, organisationId: string) {
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

  async listUserVenuesForMembers(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      userOrganisationIds: string[];
    },
  ) {
    if (args.userOrganisationIds.length === 0) return [];
    return tx
      .select({
        id: userVenues.id,
        userOrganisationId: userVenues.userOrganisationId,
        roleId: userVenues.roleId,
        archivedAt: userVenues.archivedAt,
        isActive: userVenues.isActive,
      })
      .from(userVenues)
      .where(
        and(
          eq(userVenues.organisationId, args.organisationId),
          eq(userVenues.venueId, args.venueId),
          inArray(userVenues.userOrganisationId, args.userOrganisationIds),
        ),
      );
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
  ): Promise<Array<{ id: string; slug: string; displayName: string }>> {
    if (roleIds.length === 0) return [];
    return tx
      .select({
        id: roles.id,
        slug: roles.slug,
        displayName: roles.displayName,
      })
      .from(roles)
      .where(inArray(roles.id, roleIds));
  },

  async getUserOrganisation(tx: RlsTx, userOrganisationId: string) {
    const rows = await tx
      .select({
        id: userOrganisations.id,
        organisationId: userOrganisations.organisationId,
      })
      .from(userOrganisations)
      .where(eq(userOrganisations.id, userOrganisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findLatestUserVenueMapping(
    tx: RlsTx,
    args: {
      userOrganisationId: string;
      venueId: string;
      organisationId: string;
    },
  ) {
    const rows = await tx
      .select({
        id: userVenues.id,
        archivedAt: userVenues.archivedAt,
        isActive: userVenues.isActive,
      })
      .from(userVenues)
      .where(
        and(
          eq(userVenues.userOrganisationId, args.userOrganisationId),
          eq(userVenues.venueId, args.venueId),
          eq(userVenues.organisationId, args.organisationId),
        ),
      )
      .orderBy(desc(userVenues.updatedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async reactivateUserVenue(
    tx: RlsTx,
    args: {
      id: string;
      organisationId: string;
      roleId: string | null;
      updatedAt: string;
    },
  ) {
    await tx
      .update(userVenues)
      .set({
        archivedAt: null,
        isActive: true,
        roleId: args.roleId,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(userVenues.id, args.id),
          eq(userVenues.organisationId, args.organisationId),
        ),
      );
  },
};
