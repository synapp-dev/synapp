import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { PLATFORM_ROLE_IDS, type PlatformRoleSlug } from "@/lib/roles/platform-role-ids";

type Supabase = SupabaseClient<Database>;

/** Venue-level role override (nullable = inherit org role in roster UI). */
const VENUE_ROLE_SLUGS = ["admin", "manager", "supervisor", "crew"] as const satisfies readonly (
  | "admin"
  | "manager"
  | "supervisor"
  | "crew"
)[];

export type VenueAssignableRoleSlug = (typeof VENUE_ROLE_SLUGS)[number];

export class VenueStaffAssignmentError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isVenueRoleSlug(value: string): value is VenueAssignableRoleSlug {
  return (VENUE_ROLE_SLUGS as readonly string[]).includes(value);
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

async function getOrganisationIdBySlug(
  supabase: Supabase,
  organisationSlug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", organisationSlug)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new VenueStaffAssignmentError(500, error.message);
  }
  return data?.id ?? null;
}

/**
 * Ensures the user is an active org member whose platform role grants org admin
 * (matches `user_venues_admin_manage` / `is_org_admin` RLS).
 */
export async function assertOrganisationAdmin(
  supabase: Supabase,
  userId: string,
  organisationSlug: string
): Promise<string> {
  const orgId = await getOrganisationIdBySlug(supabase, organisationSlug);
  if (!orgId) {
    throw new VenueStaffAssignmentError(404, "Organisation not found");
  }

  const { data: uo, error: uoError } = await supabase
    .from("user_organisations")
    .select("id, role_id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", orgId)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (uoError) {
    throw new VenueStaffAssignmentError(500, uoError.message);
  }
  if (!uo) {
    throw new VenueStaffAssignmentError(403, "Forbidden");
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("grants_org_admin")
    .eq("id", uo.role_id)
    .is("archived_at", null)
    .maybeSingle();

  if (roleError) {
    throw new VenueStaffAssignmentError(500, roleError.message);
  }
  if (!roleRow?.grants_org_admin) {
    throw new VenueStaffAssignmentError(403, "Forbidden");
  }

  return orgId;
}

async function getVenueIdInOrganisation(
  supabase: Supabase,
  organisationId: string,
  venueSlug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("venues")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("slug", venueSlug)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new VenueStaffAssignmentError(500, error.message);
  }
  return data?.id ?? null;
}

export type OrgMemberVenueRow = {
  userOrganisationId: string;
  userProfileId: string;
  name: string;
  email: string;
  orgRoleSlug: string;
  orgRoleDisplayName: string;
  hasVenueAccess: boolean;
  venueRoleSlug: string | null;
};

function resolveVenueRoleId(venueRoleSlug: string | null | undefined): string | null {
  if (venueRoleSlug == null || venueRoleSlug === "") {
    return null;
  }
  const normalized = venueRoleSlug.trim().toLowerCase();
  if (!isVenueRoleSlug(normalized)) {
    throw new VenueStaffAssignmentError(400, "Invalid venue role");
  }
  return PLATFORM_ROLE_IDS[normalized as PlatformRoleSlug];
}

export const venueStaffAssignmentService = {
  async listOrgMembersForVenue(
    supabase: Supabase,
    args: {
      organisationSlug: string;
      venueSlug: string;
      actorUserId: string;
    }
  ): Promise<{ venueId: string; members: OrgMemberVenueRow[] }> {
    const orgId = await assertOrganisationAdmin(
      supabase,
      args.actorUserId,
      args.organisationSlug
    );

    const venueId = await getVenueIdInOrganisation(supabase, orgId, args.venueSlug);
    if (!venueId) {
      throw new VenueStaffAssignmentError(404, "Venue not found");
    }

    const { data: uoRows, error: uoError } = await supabase
      .from("user_organisations")
      .select("id, user_profile_id, role_id")
      .eq("organisation_id", orgId)
      .eq("is_active", true)
      .is("archived_at", null);

    if (uoError) {
      throw new VenueStaffAssignmentError(500, uoError.message);
    }

    const rows = uoRows ?? [];
    if (rows.length === 0) {
      return { venueId, members: [] };
    }

    const profileIds = [...new Set(rows.map((r) => r.user_profile_id))];
    const orgRoleIds = [...new Set(rows.map((r) => r.role_id))];

    const uoIds = rows.map((r) => r.id);

    const { data: uvRows, error: uvError } = await supabase
      .from("user_venues")
      .select("id, user_organisation_id, role_id, archived_at, is_active")
      .eq("organisation_id", orgId)
      .eq("venue_id", venueId)
      .in("user_organisation_id", uoIds);

    if (uvError) {
      throw new VenueStaffAssignmentError(500, uvError.message);
    }

    const uvByUoId = new Map<string, { role_id: string | null; active: boolean }>();
    for (const uv of uvRows ?? []) {
      const active = uv.archived_at == null && uv.is_active;
      const prev = uvByUoId.get(uv.user_organisation_id);
      if (prev == null) {
        uvByUoId.set(uv.user_organisation_id, { role_id: uv.role_id, active });
      } else if (active) {
        uvByUoId.set(uv.user_organisation_id, { role_id: uv.role_id, active: true });
      } else if (!prev.active) {
        uvByUoId.set(uv.user_organisation_id, { role_id: uv.role_id, active: false });
      }
    }

    const venueRoleIds = new Set<string>();
    for (const uv of uvRows ?? []) {
      if (uv.role_id) venueRoleIds.add(uv.role_id);
    }

    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, full_name")
      .in("id", profileIds);

    if (profileError) {
      throw new VenueStaffAssignmentError(500, profileError.message);
    }

    const allRoleIds = [...new Set([...orgRoleIds, ...venueRoleIds])];
    const { data: roleRows, error: rolesError } = await supabase
      .from("roles")
      .select("id, slug, display_name")
      .in("id", allRoleIds);

    if (rolesError) {
      throw new VenueStaffAssignmentError(500, rolesError.message);
    }

    const roleById = new Map(
      (roleRows ?? []).map((r) => [r.id, { slug: r.slug, display_name: r.display_name }])
    );
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const members: OrgMemberVenueRow[] = rows
      .map((uo) => {
        const profile = profileById.get(uo.user_profile_id);
        const orgRole = roleById.get(uo.role_id);
        if (!profile || !orgRole) return null;

        const uv = uvByUoId.get(uo.id);
        const hasVenueAccess = Boolean(uv?.active);
        const venueRoleId = uv?.role_id ?? null;
        const venueRole = venueRoleId ? roleById.get(venueRoleId) : null;

        return {
          userOrganisationId: uo.id,
          userProfileId: uo.user_profile_id,
          name: displayName(profile),
          email: profile.email,
          orgRoleSlug: orgRole.slug,
          orgRoleDisplayName: orgRole.display_name,
          hasVenueAccess,
          venueRoleSlug: venueRole?.slug ?? null,
        };
      })
      .filter((m): m is OrgMemberVenueRow => m !== null);

    members.sort((a, b) => a.name.localeCompare(b.name));
    return { venueId, members };
  },

  async assignVenueAccess(
    supabase: Supabase,
    args: {
      organisationSlug: string;
      venueSlug: string;
      actorUserId: string;
      userOrganisationIds: string[];
      venueRoleSlug?: string | null;
    }
  ): Promise<{ linked: number; skipped: number }> {
    const orgId = await assertOrganisationAdmin(
      supabase,
      args.actorUserId,
      args.organisationSlug
    );

    const venueId = await getVenueIdInOrganisation(supabase, orgId, args.venueSlug);
    if (!venueId) {
      throw new VenueStaffAssignmentError(404, "Venue not found");
    }

    const roleId = resolveVenueRoleId(args.venueRoleSlug);

    const ids = [...new Set(args.userOrganisationIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new VenueStaffAssignmentError(400, "No members selected");
    }

    let linked = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const uoId of ids) {
      const { data: uo, error: uoErr } = await supabase
        .from("user_organisations")
        .select("id, organisation_id")
        .eq("id", uoId)
        .maybeSingle();

      if (uoErr) {
        throw new VenueStaffAssignmentError(500, uoErr.message);
      }
      if (!uo || uo.organisation_id !== orgId) {
        throw new VenueStaffAssignmentError(400, "Invalid membership selection");
      }

      const { data: uvRows, error: uvQErr } = await supabase
        .from("user_venues")
        .select("id, archived_at, is_active")
        .eq("user_organisation_id", uoId)
        .eq("venue_id", venueId)
        .eq("organisation_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (uvQErr) {
        throw new VenueStaffAssignmentError(500, uvQErr.message);
      }

      const existingUv = uvRows?.[0];
      const alreadyActive =
        existingUv != null && existingUv.archived_at == null && existingUv.is_active;

      if (alreadyActive) {
        skipped += 1;
        continue;
      }

      if (existingUv) {
        const { error: upErr } = await supabase
          .from("user_venues")
          .update({
            archived_at: null,
            is_active: true,
            role_id: roleId,
            updated_at: now,
          })
          .eq("id", existingUv.id)
          .eq("organisation_id", orgId);

        if (upErr) {
          throw new VenueStaffAssignmentError(500, upErr.message);
        }
        linked += 1;
        continue;
      }

      const { error: insErr } = await supabase.from("user_venues").insert({
        user_organisation_id: uoId,
        organisation_id: orgId,
        venue_id: venueId,
        role_id: roleId,
        is_active: true,
      });

      if (insErr) {
        throw new VenueStaffAssignmentError(500, insErr.message);
      }
      linked += 1;
    }

    return { linked, skipped };
  },
};
