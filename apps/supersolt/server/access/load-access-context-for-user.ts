import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

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

type MembershipRow = {
  id: string;
  organisation_id: string;
  role_id: string;
  organisations: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
};

type UserVenueRow = {
  user_organisation_id: string;
  venue_id: string;
  role_id: string | null;
};

type VenueRow = {
  id: string;
  organisation_id: string;
  name: string;
  slug: string;
  suburb: string | null;
  state: string | null;
  venue_type: string;
};

type RoleRow = {
  id: string;
  slug: string;
  display_name: string;
  grants_org_admin: boolean;
};

/**
 * Loads organisations + accessible venues for the signed-in user.
 * Shared by `GET /api/access/context` and agent chat tools.
 */
export async function loadAccessContextForUser(
  supabase: Supabase,
  userId: string
): Promise<{ data: AccessContextPayloadDto; error: null } | { data: null; error: { message: string } }> {
  const { data: memberships, error: membershipError } = await supabase
    .from("user_organisations")
    .select(
      "id, organisation_id, role_id, organisations:organisation_id ( id, name, slug, logo_url )"
    )
    .eq("user_profile_id", userId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (membershipError) {
    return { data: null, error: { message: membershipError.message } };
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];
  if (typedMemberships.length === 0) {
    return { data: { organisations: [] }, error: null };
  }

  const membershipIds = typedMemberships.map((membership) => membership.id);
  const { data: userVenueRows, error: userVenueError } = await supabase
    .from("user_venues")
    .select("user_organisation_id, venue_id, role_id")
    .in("user_organisation_id", membershipIds)
    .eq("is_active", true)
    .is("archived_at", null);

  if (userVenueError) {
    return { data: null, error: { message: userVenueError.message } };
  }

  const typedUserVenueRows = (userVenueRows ?? []) as UserVenueRow[];
  const roleIdSet = new Set<string>();
  for (const m of typedMemberships) {
    roleIdSet.add(m.role_id);
  }
  for (const uv of typedUserVenueRows) {
    if (uv.role_id) roleIdSet.add(uv.role_id);
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("roles")
    .select("id, slug, display_name, grants_org_admin")
    .in("id", [...roleIdSet]);

  if (rolesError) {
    return { data: null, error: { message: rolesError.message } };
  }

  const roleById = new Map((roleRows ?? []).map((r) => [r.id, r as RoleRow]));

  const venueIds = Array.from(
    new Set(typedUserVenueRows.map((row) => row.venue_id).filter(Boolean))
  );

  let venuesById = new Map<string, VenueRow>();
  if (venueIds.length > 0) {
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select("id, organisation_id, name, slug, suburb, state, venue_type")
      .in("id", venueIds)
      .eq("is_active", true)
      .is("archived_at", null);

    if (venuesError) {
      return { data: null, error: { message: venuesError.message } };
    }

    const typedVenues = (venues ?? []) as VenueRow[];
    venuesById = new Map(typedVenues.map((venue) => [venue.id, venue]));
  }

  const membershipById = new Map(
    typedMemberships.map((membership) => [membership.id, membership])
  );
  const venuesByMembershipId = new Map<string, AccessContextVenueDto[]>();

  for (const row of typedUserVenueRows) {
    const venue = venuesById.get(row.venue_id);
    if (!venue) {
      continue;
    }

    const membership = membershipById.get(row.user_organisation_id);
    if (!membership || membership.organisation_id !== venue.organisation_id) {
      continue;
    }

    const orgRole = roleById.get(membership.role_id);
    if (!orgRole) {
      continue;
    }

    const venueRole = row.role_id ? roleById.get(row.role_id) : null;
    const effective = venueRole ?? orgRole;

    const venueList = venuesByMembershipId.get(row.user_organisation_id) ?? [];
    venueList.push({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      suburb: venue.suburb,
      state: venue.state,
      venueType: venue.venue_type,
      roleSlug: effective.slug,
      roleDisplayName: effective.display_name,
      grantsOrgAdmin: effective.grants_org_admin,
    });
    venuesByMembershipId.set(row.user_organisation_id, venueList);
  }

  const organisations: AccessContextOrganisationDto[] = typedMemberships
    .map((membership) => {
      const orgRole = roleById.get(membership.role_id);
      if (!orgRole) {
        return null;
      }
      return {
        id: membership.organisation_id,
        name: membership.organisations?.name ?? "Unknown organisation",
        slug: membership.organisations?.slug ?? "",
        logoUrl: membership.organisations?.logo_url ?? null,
        roleSlug: orgRole.slug,
        roleDisplayName: orgRole.display_name,
        grantsOrgAdmin: orgRole.grants_org_admin,
        venues: (venuesByMembershipId.get(membership.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      };
    })
    .filter((o): o is AccessContextOrganisationDto => o !== null && o.slug.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { data: { organisations }, error: null };
}
