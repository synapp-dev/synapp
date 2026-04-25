import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import {
  PLATFORM_ROLE_IDS,
  type PlatformRoleSlug,
} from "@/lib/roles/platform-role-ids";

type Supabase = SupabaseClient<Database>;

/** Service-role client for auth admin + global profile lookup (RLS-safe). */
type ServiceSupabase = SupabaseClient<Database>;

const OWNER_ROLE_ID = PLATFORM_ROLE_IDS.owner;

/** Org roles assignable by owner from organisation settings (excludes owner). */
const ASSIGNABLE_ORG_ROLE_SLUGS = [
  "admin",
  "manager",
  "supervisor",
  "crew",
] as const satisfies readonly PlatformRoleSlug[];

export type AssignableOrgRoleSlug = (typeof ASSIGNABLE_ORG_ROLE_SLUGS)[number];

export class OrganisationMembersServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isAssignableOrgRoleSlug(value: string): value is AssignableOrgRoleSlug {
  return (ASSIGNABLE_ORG_ROLE_SLUGS as readonly string[]).includes(value);
}

function normalizeAssignableRoleSlug(raw: string): AssignableOrgRoleSlug | null {
  const normalized = raw.trim().toLowerCase();
  return isAssignableOrgRoleSlug(normalized) ? normalized : null;
}

async function applyFirstLastNameToProfile(
  admin: ServiceSupabase,
  profileId: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const fn = firstName.trim();
  const ln = lastName.trim();
  if (!fn || !ln) return;
  const combined = `${fn} ${ln}`.trim();
  const { error } = await admin
    .from("user_profiles")
    .update({
      first_name: fn,
      last_name: ln,
      full_name: combined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    throw new OrganisationMembersServiceError(500, error.message);
  }
}

/**
 * Resolves `user_profiles.id` by email, or creates a confirmed Auth user (random password;
 * user should use password reset to sign in). New users get a profile via `handle_new_auth_user`.
 */
async function resolveOrCreateUserProfileId(
  admin: ServiceSupabase,
  email: string,
  meta: { firstName?: string; lastName?: string; fullName?: string }
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new OrganisationMembersServiceError(500, existingError.message);
  }

  const fn = meta.firstName?.trim() ?? "";
  const ln = meta.lastName?.trim() ?? "";

  if (existing?.id) {
    await applyFirstLastNameToProfile(admin, existing.id, fn, ln);
    return existing.id;
  }

  if (!fn || !ln) {
    throw new OrganisationMembersServiceError(
      400,
      "First name and last name are required to create a new user"
    );
  }

  let full = meta.fullName?.trim() ?? "";
  if (!full && (fn || ln)) {
    full = `${fn} ${ln}`.trim();
  }

  // Random password: user is email-confirmed but should set a password via "Forgot password".
  const password = randomBytes(32).toString("base64url");
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      ...(fn ? { first_name: fn } : {}),
      ...(ln ? { last_name: ln } : {}),
      ...(full ? { full_name: full } : {}),
    },
  });

  if (!createError && created.user?.id) {
    return created.user.id;
  }

  const msg = createError?.message.toLowerCase() ?? "";
  if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
    const { data: again, error: againError } = await admin
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (againError) {
      throw new OrganisationMembersServiceError(500, againError.message);
    }
    if (again?.id) {
      await applyFirstLastNameToProfile(admin, again.id, fn, ln);
      return again.id;
    }
  }

  throw new OrganisationMembersServiceError(
    400,
    createError?.message ?? "Could not create user"
  );
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
    throw new OrganisationMembersServiceError(500, error.message);
  }
  return data?.id ?? null;
}

/**
 * Resolves organisation id and ensures the user is an active organisation owner.
 */
export async function assertOrganisationOwner(
  supabase: Supabase,
  userId: string,
  organisationSlug: string
): Promise<string> {
  const orgId = await getOrganisationIdBySlug(supabase, organisationSlug);
  if (!orgId) {
    throw new OrganisationMembersServiceError(404, "Organisation not found");
  }

  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", orgId)
    .eq("role_id", OWNER_ROLE_ID)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new OrganisationMembersServiceError(500, error.message);
  }
  if (!data) {
    throw new OrganisationMembersServiceError(403, "Forbidden");
  }
  return orgId;
}

export type OrganisationMemberRow = {
  userOrganisationId: string;
  userProfileId: string;
  name: string;
  email: string;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
};

export const organisationMembersService = {
  /**
   * Whether a profile already exists for this email (any org). Used for add-member wizard step 1.
   */
  async checkMemberEmail(
    supabase: Supabase,
    admin: ServiceSupabase,
    args: { organisationSlug: string; actorUserId: string; email: string }
  ): Promise<{ exists: boolean }> {
    await assertOrganisationOwner(supabase, args.actorUserId, args.organisationSlug);

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new OrganisationMembersServiceError(400, "Valid email is required");
    }

    const { data, error } = await admin
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new OrganisationMembersServiceError(500, error.message);
    }

    return { exists: Boolean(data?.id) };
  },

  async listMembers(
    supabase: Supabase,
    args: { organisationSlug: string; actorUserId: string }
  ): Promise<{ members: OrganisationMemberRow[] }> {
    const orgId = await assertOrganisationOwner(
      supabase,
      args.actorUserId,
      args.organisationSlug
    );

    const { data: uoRows, error: uoError } = await supabase
      .from("user_organisations")
      .select("id, user_profile_id, role_id")
      .eq("organisation_id", orgId)
      .eq("is_active", true)
      .is("archived_at", null);

    if (uoError) {
      throw new OrganisationMembersServiceError(500, uoError.message);
    }

    const rows = uoRows ?? [];
    if (rows.length === 0) {
      return { members: [] };
    }

    const profileIds = [...new Set(rows.map((r) => r.user_profile_id))];
    const roleIds = [...new Set(rows.map((r) => r.role_id))];

    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, full_name")
      .in("id", profileIds);

    if (profileError) {
      throw new OrganisationMembersServiceError(500, profileError.message);
    }

    const { data: roleRows, error: rolesError } = await supabase
      .from("roles")
      .select("id, slug, display_name, grants_org_admin")
      .in("id", roleIds);

    if (rolesError) {
      throw new OrganisationMembersServiceError(500, rolesError.message);
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleById = new Map(
      (roleRows ?? []).map((r) => [
        r.id,
        {
          slug: r.slug,
          display_name: r.display_name,
          grants_org_admin: r.grants_org_admin,
        },
      ])
    );

    const members: OrganisationMemberRow[] = rows
      .map((uo) => {
        const profile = profileById.get(uo.user_profile_id);
        const role = roleById.get(uo.role_id);
        if (!profile || !role) {
          return null;
        }
        return {
          userOrganisationId: uo.id,
          userProfileId: uo.user_profile_id,
          name: displayName(profile),
          email: profile.email,
          roleSlug: role.slug,
          roleDisplayName: role.display_name,
          grantsOrgAdmin: role.grants_org_admin,
        };
      })
      .filter((m): m is OrganisationMemberRow => m !== null);

    members.sort((a, b) => a.name.localeCompare(b.name));
    return { members };
  },

  async updateMemberRole(
    supabase: Supabase,
    args: {
      organisationSlug: string;
      actorUserId: string;
      userOrganisationId: string;
      roleSlug: string;
    }
  ): Promise<void> {
    const orgId = await assertOrganisationOwner(
      supabase,
      args.actorUserId,
      args.organisationSlug
    );

    const normalized = normalizeAssignableRoleSlug(args.roleSlug);
    if (!normalized) {
      throw new OrganisationMembersServiceError(400, "Invalid role");
    }
    const newRoleId = PLATFORM_ROLE_IDS[normalized];

    const { data: target, error: targetError } = await supabase
      .from("user_organisations")
      .select("id, role_id, organisation_id")
      .eq("id", args.userOrganisationId)
      .maybeSingle();

    if (targetError) {
      throw new OrganisationMembersServiceError(500, targetError.message);
    }
    if (!target || target.organisation_id !== orgId) {
      throw new OrganisationMembersServiceError(404, "Membership not found");
    }

    if (target.role_id === OWNER_ROLE_ID) {
      const { count, error: countError } = await supabase
        .from("user_organisations")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .eq("role_id", OWNER_ROLE_ID)
        .eq("is_active", true)
        .is("archived_at", null);

      if (countError) {
        throw new OrganisationMembersServiceError(500, countError.message);
      }
      const ownerCount = count ?? 0;
      if (ownerCount <= 1) {
        throw new OrganisationMembersServiceError(
          400,
          "Cannot remove the last organisation owner"
        );
      }
    }

    const { error: updateError } = await supabase
      .from("user_organisations")
      .update({
        role_id: newRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.userOrganisationId)
      .eq("organisation_id", orgId);

    if (updateError) {
      throw new OrganisationMembersServiceError(500, updateError.message);
    }
  },

  async addMember(
    supabase: Supabase,
    admin: ServiceSupabase,
    args: {
      organisationSlug: string;
      actorUserId: string;
      email: string;
      roleSlug: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
    }
  ): Promise<void> {
    const orgId = await assertOrganisationOwner(
      supabase,
      args.actorUserId,
      args.organisationSlug
    );

    const roleSlug = normalizeAssignableRoleSlug(args.roleSlug);
    if (!roleSlug) {
      throw new OrganisationMembersServiceError(400, "Invalid role");
    }
    const roleId = PLATFORM_ROLE_IDS[roleSlug];

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new OrganisationMembersServiceError(400, "Valid email is required");
    }

    const userProfileId = await resolveOrCreateUserProfileId(admin, email, {
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: args.fullName,
    });

    const { data: uoRows, error: uoLookupError } = await supabase
      .from("user_organisations")
      .select("id, archived_at, is_active")
      .eq("user_profile_id", userProfileId)
      .eq("organisation_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (uoLookupError) {
      throw new OrganisationMembersServiceError(500, uoLookupError.message);
    }

    const existing = uoRows?.[0];
    const isActiveMember =
      existing != null && existing.archived_at == null && existing.is_active;

    if (isActiveMember) {
      throw new OrganisationMembersServiceError(409, "Already a member of this organisation");
    }

    const now = new Date().toISOString();

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_organisations")
        .update({
          archived_at: null,
          is_active: true,
          role_id: roleId,
          joined_at: now,
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("organisation_id", orgId);

      if (updateError) {
        throw new OrganisationMembersServiceError(500, updateError.message);
      }
      return;
    }

    const { error: insertError } = await supabase.from("user_organisations").insert({
      user_profile_id: userProfileId,
      organisation_id: orgId,
      role_id: roleId,
      is_active: true,
      joined_at: now,
    });

    if (insertError) {
      throw new OrganisationMembersServiceError(500, insertError.message);
    }
  },
};
