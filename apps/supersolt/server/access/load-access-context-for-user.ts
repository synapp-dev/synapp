import { and, eq, inArray, isNull } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import {
  organisations,
  roles,
  userOrganisations,
  userVenues,
  venues,
} from "@/server/db/schema";

export type AccessContextVenueDto = {
  id: string;
  name: string;
  slug: string;
  suburb: string | null;
  state: string | null;
  venueType: string;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
};

export type AccessContextOrganisationDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  venues: AccessContextVenueDto[];
};

export type AccessContextPayloadDto = {
  organisations: AccessContextOrganisationDto[];
};

/**
 * Loads organisations + accessible venues for the signed-in user.
 * Shared by `GET /api/access/context` and agent chat tools.
 */
export async function loadAccessContextForUser(
  appDb: AppDb,
  userId: string,
): Promise<
  | { data: AccessContextPayloadDto; error: null }
  | { data: null; error: { message: string } }
> {
  try {
    const data = await appDb.rls(async (tx) => {
      const memberships = await tx
        .select({
          membershipId: userOrganisations.id,
          organisationId: userOrganisations.organisationId,
          roleId: userOrganisations.roleId,
          orgName: organisations.name,
          orgSlug: organisations.slug,
          logoUrl: organisations.logoUrl,
        })
        .from(userOrganisations)
        .innerJoin(
          organisations,
          eq(organisations.id, userOrganisations.organisationId),
        )
        .where(
          and(
            eq(userOrganisations.userProfileId, userId),
            eq(userOrganisations.isActive, true),
            isNull(userOrganisations.archivedAt),
          ),
        );

      if (memberships.length === 0) {
        return { organisations: [] };
      }

      const membershipIds = memberships.map((m) => m.membershipId);
      const userVenueRows = await tx
        .select({
          userOrganisationId: userVenues.userOrganisationId,
          venueId: userVenues.venueId,
          roleId: userVenues.roleId,
        })
        .from(userVenues)
        .where(
          and(
            inArray(userVenues.userOrganisationId, membershipIds),
            eq(userVenues.isActive, true),
            isNull(userVenues.archivedAt),
          ),
        );

      const roleIdSet = new Set<string>();
      for (const m of memberships) {
        roleIdSet.add(m.roleId);
      }
      for (const uv of userVenueRows) {
        if (uv.roleId) {
          roleIdSet.add(uv.roleId);
        }
      }

      const roleRows = await tx
        .select()
        .from(roles)
        .where(
          and(inArray(roles.id, [...roleIdSet]), isNull(roles.archivedAt)),
        );

      const roleById = new Map(roleRows.map((r) => [r.id, r]));

      const venueIds = [...new Set(userVenueRows.map((r) => r.venueId))];
      const venueRows =
        venueIds.length > 0
          ? await tx
              .select({
                id: venues.id,
                organisationId: venues.organisationId,
                name: venues.name,
                slug: venues.slug,
                suburb: venues.suburb,
                state: venues.state,
                venueType: venues.venueType,
              })
              .from(venues)
              .where(
                and(
                  inArray(venues.id, venueIds),
                  eq(venues.isActive, true),
                  isNull(venues.archivedAt),
                ),
              )
          : [];

      const venuesById = new Map(venueRows.map((v) => [v.id, v]));
      const membershipById = new Map(
        memberships.map((m) => [m.membershipId, m]),
      );
      const venuesByMembershipId = new Map<string, AccessContextVenueDto[]>();

      for (const row of userVenueRows) {
        const venue = venuesById.get(row.venueId);
        if (!venue) {
          continue;
        }

        const membership = membershipById.get(row.userOrganisationId);
        if (!membership || membership.organisationId !== venue.organisationId) {
          continue;
        }

        const orgRole = roleById.get(membership.roleId);
        if (!orgRole) {
          continue;
        }

        const venueRole = row.roleId ? roleById.get(row.roleId) : null;
        const effective = venueRole ?? orgRole;

        const venueList = venuesByMembershipId.get(row.userOrganisationId) ?? [];
        venueList.push({
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          suburb: venue.suburb,
          state: venue.state,
          venueType: venue.venueType,
          roleSlug: effective.slug,
          roleDisplayName: effective.displayName,
          grantsOrgAdmin: effective.grantsOrgAdmin,
        });
        venuesByMembershipId.set(row.userOrganisationId, venueList);
      }

      const organisationsOut: AccessContextOrganisationDto[] = memberships
        .map((membership) => {
          const orgRole = roleById.get(membership.roleId);
          if (!orgRole || !membership.orgSlug) {
            return null;
          }
          return {
            id: membership.organisationId,
            name: membership.orgName ?? "Unknown organisation",
            slug: membership.orgSlug,
            logoUrl: membership.logoUrl,
            roleSlug: orgRole.slug,
            roleDisplayName: orgRole.displayName,
            grantsOrgAdmin: orgRole.grantsOrgAdmin,
            venues: (venuesByMembershipId.get(membership.membershipId) ?? []).sort(
              (a, b) => a.name.localeCompare(b.name),
            ),
          };
        })
        .filter(
          (o): o is AccessContextOrganisationDto =>
            o !== null && o.slug.length > 0,
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      return { organisations: organisationsOut };
    });

    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { data: null, error: { message } };
  }
}
