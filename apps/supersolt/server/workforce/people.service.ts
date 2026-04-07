import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";

type Supabase = SupabaseClient<Database>;

export type PeopleRoleTier = "manager" | "supervisor" | "crew" | "custom";

export type VenueStaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  roleTier: PeopleRoleTier;
  /** Default roster station for this venue (separate from access `roleSlug`). */
  positionSlug: string | null;
  positionDisplayName: string | null;
  startDate: string;
  status: "active" | "inactive";
};

type RoleRow = {
  id: string;
  slug: string;
  display_name: string;
  grants_org_admin: boolean;
};

export class PeopleServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function assertVenueAccess(
  supabase: Supabase,
  args: {
    userId: string;
    organisationId: string;
    venueId: string;
  }
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", args.userId)
    .eq("organisation_id", args.organisationId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new PeopleServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new PeopleServiceError(403, "Forbidden");
  }

  const { data: venueAccess, error: venueError } = await supabase
    .from("user_venues")
    .select("id")
    .in("user_organisation_id", membershipIds)
    .eq("venue_id", args.venueId)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1);

  if (venueError) {
    throw new PeopleServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new PeopleServiceError(403, "Forbidden");
  }
}

function roleTierFromSlug(slug: string): PeopleRoleTier {
  if (slug === "supervisor") return "supervisor";
  if (slug === "crew") return "crew";
  if (slug === "owner" || slug === "admin" || slug === "manager") return "manager";
  return "custom";
}

function displayName(profile: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return profile.email;
}

export const peopleService = {
  async listForVenue(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
    }
  ): Promise<{ staff: VenueStaffMember[] }> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new PeopleServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const { data: uvRows, error: uvError } = await supabase
      .from("user_venues")
      .select("user_organisation_id, role_id, default_position_id")
      .eq("organisation_id", context.organisationId)
      .eq("venue_id", context.venueId)
      .eq("is_active", true)
      .is("archived_at", null);

    if (uvError) {
      throw new PeopleServiceError(500, uvError.message);
    }

    const uoIds = (uvRows ?? []).map((r) => r.user_organisation_id);
    if (uoIds.length === 0) {
      return { staff: [] };
    }

    const venueRoleIdByUo = new Map(
      (uvRows ?? []).map((r) => [r.user_organisation_id, r.role_id as string | null])
    );

    const defaultPositionIdByUo = new Map(
      (uvRows ?? []).map((r) => [
        r.user_organisation_id,
        r.default_position_id as string | null,
      ])
    );

    const positionIdSet = new Set<string>();
    for (const uv of uvRows ?? []) {
      if (uv.default_position_id) positionIdSet.add(uv.default_position_id);
    }

    let positionById = new Map<
      string,
      { slug: string; display_name: string }
    >();
    if (positionIdSet.size > 0) {
      const { data: positionRows, error: posError } = await supabase
        .from("positions")
        .select("id, slug, display_name")
        .in("id", [...positionIdSet]);

      if (posError) {
        throw new PeopleServiceError(500, posError.message);
      }

      positionById = new Map(
        (positionRows ?? []).map((p) => [
          p.id,
          { slug: p.slug, display_name: p.display_name },
        ])
      );
    }

    const { data: uoRows, error: uoError } = await supabase
      .from("user_organisations")
      .select("id, role_id, user_profile_id, joined_at, created_at, is_active, archived_at")
      .in("id", uoIds)
      .eq("is_active", true)
      .is("archived_at", null);

    if (uoError) {
      throw new PeopleServiceError(500, uoError.message);
    }

    const profileIds = (uoRows ?? []).map((r) => r.user_profile_id);
    if (profileIds.length === 0) {
      return { staff: [] };
    }

    const roleIdSet = new Set<string>();
    for (const uo of uoRows ?? []) {
      roleIdSet.add(uo.role_id);
    }
    for (const uv of uvRows ?? []) {
      if (uv.role_id) roleIdSet.add(uv.role_id);
    }

    const { data: roleRows, error: rolesError } = await supabase
      .from("roles")
      .select("id, slug, display_name, grants_org_admin")
      .in("id", [...roleIdSet]);

    if (rolesError) {
      throw new PeopleServiceError(500, rolesError.message);
    }

    const roleById = new Map(
      (roleRows ?? []).map((r) => [
        r.id,
        {
          id: r.id,
          slug: r.slug,
          display_name: r.display_name,
          grants_org_admin: r.grants_org_admin,
        } satisfies RoleRow,
      ])
    );

    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, full_name, phone, is_active, archived_at")
      .in("id", profileIds);

    if (profileError) {
      throw new PeopleServiceError(500, profileError.message);
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const staff: VenueStaffMember[] = (uoRows ?? []).map((uo) => {
      const profile = profileById.get(uo.user_profile_id);
      if (!profile) {
        return null;
      }
      const venueRoleId = venueRoleIdByUo.get(uo.id) ?? null;
      const orgRole = roleById.get(uo.role_id);
      if (!orgRole) {
        return null;
      }
      const venueRole = venueRoleId ? roleById.get(venueRoleId) : null;
      const effective = venueRole ?? orgRole;
      const defaultPositionId = defaultPositionIdByUo.get(uo.id) ?? null;
      const positionRow = defaultPositionId ? positionById.get(defaultPositionId) : null;
      const startDate = uo.joined_at ?? uo.created_at;
      const activeProfile = profile.is_active && profile.archived_at == null;
      const status: "active" | "inactive" = activeProfile ? "active" : "inactive";

      return {
        id: profile.id,
        name: displayName(profile),
        email: profile.email,
        phone: profile.phone ?? null,
        roleSlug: effective.slug,
        roleDisplayName: effective.display_name,
        grantsOrgAdmin: effective.grants_org_admin,
        roleTier: roleTierFromSlug(effective.slug),
        positionSlug: positionRow?.slug ?? null,
        positionDisplayName: positionRow?.display_name ?? null,
        startDate,
        status,
      };
    }).filter((row): row is VenueStaffMember => row !== null);

    staff.sort((a, b) => a.name.localeCompare(b.name));

    return { staff };
  },
};
