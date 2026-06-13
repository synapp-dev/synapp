import { and, eq, inArray, isNull } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  organisations,
  roles,
  userOrganisations,
  userVenues,
  venues,
} from "@/server/db/schema";
import { AuthError } from "@/server/auth/errors";

export type TenantRoleInfo = {
  roleId: string;
  slug: string;
  displayName: string;
  grantsOrgAdmin: boolean;
  sortOrder: number;
};

export type TenantVenueRole = {
  venueId: string;
  venueSlug: string;
  role: TenantRoleInfo;
};

export type TenantOrganisationRole = {
  organisationId: string;
  organisationSlug: string;
  membershipId: string;
  role: TenantRoleInfo;
  venues: TenantVenueRole[];
};

export type UserTenantRoles = {
  organisations: Array<{
    organisationId: string;
    organisationSlug: string;
    membershipId: string;
    roleSlug: string;
    roleDisplayName: string;
    grantsOrgAdmin: boolean;
    venues: Array<{
      venueId: string;
      venueSlug: string;
      roleSlug: string;
      roleDisplayName: string;
      grantsOrgAdmin: boolean;
    }>;
  }>;
};

function mapRole(row: typeof roles.$inferSelect): TenantRoleInfo {
  return {
    roleId: row.id,
    slug: row.slug,
    displayName: row.displayName,
    grantsOrgAdmin: row.grantsOrgAdmin,
    sortOrder: row.sortOrder,
  };
}

export async function loadUserTenantRoles(
  tx: RlsTx,
  userId: string,
): Promise<UserTenantRoles> {
  const memberships = await tx
    .select({
      membershipId: userOrganisations.id,
      organisationId: userOrganisations.organisationId,
      organisationSlug: organisations.slug,
      roleId: userOrganisations.roleId,
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

  const roleIds = [...new Set(memberships.map((m) => m.roleId))];
  const roleRows = await tx
    .select()
    .from(roles)
    .where(and(inArray(roles.id, roleIds), isNull(roles.archivedAt)));

  const roleById = new Map(roleRows.map((r) => [r.id, mapRole(r)]));

  const membershipIds = memberships.map((m) => m.membershipId);
  const venueRows = await tx
    .select({
      userOrganisationId: userVenues.userOrganisationId,
      venueId: userVenues.venueId,
      venueSlug: venues.slug,
      roleId: userVenues.roleId,
    })
    .from(userVenues)
    .innerJoin(venues, eq(venues.id, userVenues.venueId))
    .where(
      and(
        inArray(userVenues.userOrganisationId, membershipIds),
        eq(userVenues.isActive, true),
        isNull(userVenues.archivedAt),
        eq(venues.isActive, true),
        isNull(venues.archivedAt),
      ),
    );

  const venuesByMembership = new Map<string, typeof venueRows>();
  for (const row of venueRows) {
    const list = venuesByMembership.get(row.userOrganisationId) ?? [];
    list.push(row);
    venuesByMembership.set(row.userOrganisationId, list);
  }

  const organisationsOut: UserTenantRoles["organisations"] = [];

  for (const membership of memberships) {
    const orgRole = roleById.get(membership.roleId);
    if (!orgRole) {
      continue;
    }

    const venueList = venuesByMembership.get(membership.membershipId) ?? [];
    const venuesOut = venueList
      .map((v) => {
        const effective =
          (v.roleId ? roleById.get(v.roleId) : undefined) ?? orgRole;
        return {
          venueId: v.venueId,
          venueSlug: v.venueSlug,
          roleSlug: effective.slug,
          roleDisplayName: effective.displayName,
          grantsOrgAdmin: effective.grantsOrgAdmin,
        };
      })
      .sort((a, b) => a.venueSlug.localeCompare(b.venueSlug));

    organisationsOut.push({
      organisationId: membership.organisationId,
      organisationSlug: membership.organisationSlug,
      membershipId: membership.membershipId,
      roleSlug: orgRole.slug,
      roleDisplayName: orgRole.displayName,
      grantsOrgAdmin: orgRole.grantsOrgAdmin,
      venues: venuesOut,
    });
  }

  organisationsOut.sort((a, b) =>
    a.organisationSlug.localeCompare(b.organisationSlug),
  );

  return { organisations: organisationsOut };
}

export async function getUserTenantRoles(
  appDb: AppDb,
  userId: string,
): Promise<UserTenantRoles> {
  return appDb.rls((tx) => loadUserTenantRoles(tx, userId));
}

export function assertVenueMember(
  tenantRoles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): void {
  const org = tenantRoles.organisations.find(
    (o) => o.organisationId === args.organisationId,
  );
  if (!org) {
    throw new AuthError(403, "Forbidden");
  }
  const venue = org.venues.find((v) => v.venueId === args.venueId);
  if (!venue) {
    throw new AuthError(403, "Forbidden");
  }
}

export function assertOrganisationAdmin(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): void {
  if (!isOrganisationAdmin(tenantRoles, organisationId)) {
    throw new AuthError(403, "Forbidden");
  }
}

export function isOrganisationAdmin(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): boolean {
  const org = tenantRoles.organisations.find(
    (o) => o.organisationId === organisationId,
  );
  return org?.grantsOrgAdmin === true;
}

export function assertOrganisationOwner(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): void {
  const org = tenantRoles.organisations.find(
    (o) => o.organisationId === organisationId,
  );
  if (!org || org.roleSlug !== "owner") {
    throw new AuthError(403, "Forbidden");
  }
}

export function resolveOrganisationIdBySlug(
  tenantRoles: UserTenantRoles,
  organisationSlug: string,
): string | null {
  return (
    tenantRoles.organisations.find(
      (o) => o.organisationSlug === organisationSlug,
    )?.organisationId ?? null
  );
}

export async function assertVenueMemberDb(
  appDb: AppDb,
  userId: string,
  args: { organisationId: string; venueId: string },
): Promise<UserTenantRoles> {
  const tenantRoles = await getUserTenantRoles(appDb, userId);
  assertVenueMember(tenantRoles, args);
  return tenantRoles;
}
