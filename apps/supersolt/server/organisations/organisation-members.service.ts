import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import type { RequestAuthContext } from "@/server/auth/context";
import {
  assertOrganisationOwner,
  resolveOrganisationIdBySlug,
} from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { PLATFORM_ROLE_IDS } from "@/lib/roles/platform-role-ids";
import { onboardingRepo } from "@/server/onboarding/onboarding.repo";
import { organisationMembersRepo } from "@/server/organisations/organisation-members.repo";
import { membersWhitelistRepo } from "@/server/organisations/members-whitelist.repo";
import { MembersServiceError } from "@/server/organisations/members-errors";
import {
  buildMembersList,
  membersInviteService,
} from "@/server/organisations/members-invite.service";
import {
  canArchiveMember,
  canDemoteMember,
  displayNameFromProfile,
  normalizeAssignableRoleSlug,
  normalizeInviteEmail,
  OWNER_ROLE_ID,
} from "@/server/organisations/members-policy";
import { trackMembersEvent } from "@/server/organisations/members-telemetry";

type AuthAdminClient = SupabaseClient<Database>;

export class OrganisationMembersServiceError extends MembersServiceError {}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new MembersServiceError("permissions.forbidden", error.message, error.status);
  }
  throw error;
}

function assertOrganisationOwnerBySlug(
  ctx: RequestAuthContext,
  organisationSlug: string,
): string {
  const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!orgId) {
    throw new MembersServiceError("permissions.not_found", "Organisation not found", 404);
  }
  try {
    assertOrganisationOwner(ctx.tenantRoles, orgId);
  } catch (error) {
    mapAuthError(error);
  }
  return orgId;
}

async function assertVenueIdsBelongToOrg(
  ctx: RequestAuthContext,
  organisationId: string,
  venueIds: string[],
): Promise<void> {
  if (venueIds.length === 0) {
    throw new MembersServiceError(
      "permissions.invalid_venues",
      "Select at least one venue",
    );
  }
  const venues = await ctx.appDb.rls((tx) =>
    onboardingRepo.listVenuesForOrganisation(tx, organisationId),
  );
  const allowed = new Set(venues.map((v) => v.id));
  for (const id of venueIds) {
    if (!allowed.has(id)) {
      throw new MembersServiceError("permissions.invalid_venues", "Invalid venue selection");
    }
  }
}

export const organisationMembersService = {
  async checkMemberEmail(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; email: string },
  ): Promise<{ exists: boolean }> {
    assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const email = normalizeInviteEmail(args.email);
    const profileId = await organisationMembersRepo.findProfileIdByEmail(
      ctx.appDb,
      email,
    );
    return { exists: Boolean(profileId) };
  },

  async listMembers(
    ctx: RequestAuthContext,
    args: { organisationSlug: string },
  ) {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    trackMembersEvent("permissions.viewed", { organisation_id: orgId });
    return buildMembersList(ctx, orgId);
  },

  async getMember(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; userOrganisationId: string },
  ) {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const membership = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.getMembershipDetail(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const [profiles, roles, uvRows, venues] = await ctx.appDb.rls((tx) =>
      Promise.all([
        organisationMembersRepo.listProfilesByIds(tx, [membership.userProfileId]),
        organisationMembersRepo.listRolesByIds(tx, [membership.roleId]),
        organisationMembersRepo.listVenueAssignmentsForMembers(tx, {
          organisationId: orgId,
          userOrganisationIds: [membership.id],
        }),
        onboardingRepo.listVenuesForOrganisation(tx, orgId),
      ]),
    );

    const profile = profiles[0];
    const role = roles[0];
    if (!profile || !role) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const venueIds = uvRows
      .filter((uv) => uv.archivedAt == null && uv.isActive)
      .map((uv) => uv.venueId);

    return {
      userOrganisationId: membership.id,
      userProfileId: membership.userProfileId,
      name: displayNameFromProfile(profile),
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      roleSlug: role.slug,
      roleDisplayName: role.displayName,
      venueIds,
      status:
        membership.archivedAt != null || !membership.isActive
          ? ("archived" as const)
          : ("active" as const),
      venues: venues.map((v) => ({ id: v.id, name: v.name, slug: v.slug })),
    };
  },

  async updateMember(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      userOrganisationId: string;
      roleSlug?: string;
      venueIds?: string[];
      firstName?: string;
      lastName?: string;
    },
  ): Promise<void> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const membership = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.getMembershipDetail(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const now = new Date().toISOString();

    if (args.roleSlug != null) {
      const normalized = normalizeAssignableRoleSlug(args.roleSlug);
      if (!normalized) {
        throw new MembersServiceError("permissions.invalid_role", "Invalid role");
      }
      const newRoleId = PLATFORM_ROLE_IDS[normalized];
      const ownerCount = await ctx.appDb.rls((tx) =>
        organisationMembersRepo.countActiveOwners(tx, {
          organisationId: orgId,
          ownerRoleId: OWNER_ROLE_ID,
        }),
      );
      if (
        !canDemoteMember({
          currentRoleId: membership.roleId,
          newRoleId,
          ownerRoleId: OWNER_ROLE_ID,
          activeOwnerCount: ownerCount,
        })
      ) {
        throw new MembersServiceError(
          "permissions.last_owner",
          "Cannot remove the last organisation owner",
        );
      }
      await ctx.appDb.rls((tx) =>
        organisationMembersRepo.updateMembershipRole(tx, {
          userOrganisationId: args.userOrganisationId,
          organisationId: orgId,
          roleId: newRoleId,
          updatedAt: now,
        }),
      );
      trackMembersEvent("permissions.role_changed", {
        organisation_id: orgId,
        from_slug: membership.roleId,
        to_slug: normalized,
      });
    }

    if (args.venueIds != null) {
      await assertVenueIdsBelongToOrg(ctx, orgId, args.venueIds);
      await ctx.appDb.rls((tx) =>
        organisationMembersRepo.replaceVenueAssignments(tx, {
          userOrganisationId: args.userOrganisationId,
          organisationId: orgId,
          venueIds: args.venueIds!,
          updatedAt: now,
        }),
      );
      trackMembersEvent("permissions.venues_changed", {
        organisation_id: orgId,
        venue_count: args.venueIds.length,
      });
    }

    const fn = args.firstName?.trim() ?? "";
    const ln = args.lastName?.trim() ?? "";
    if (fn || ln) {
      const combined = `${fn} ${ln}`.trim();
      await organisationMembersRepo.updateProfileNames(ctx.appDb, {
        profileId: membership.userProfileId,
        firstName: fn,
        lastName: ln,
        fullName: combined || `${fn} ${ln}`.trim(),
        updatedAt: now,
      });
    }
  },

  async archiveMember(
    ctx: RequestAuthContext,
    authAdmin: AuthAdminClient,
    args: { organisationSlug: string; userOrganisationId: string },
  ): Promise<void> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const membership = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.getMembershipDetail(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const ownerCount = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.countActiveOwners(tx, {
        organisationId: orgId,
        ownerRoleId: OWNER_ROLE_ID,
      }),
    );
    if (
      !canArchiveMember({
        roleId: membership.roleId,
        ownerRoleId: OWNER_ROLE_ID,
        activeOwnerCount: ownerCount,
      })
    ) {
      throw new MembersServiceError(
        "permissions.last_owner",
        "Cannot archive the last organisation owner",
      );
    }

    const profiles = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.listProfilesByIds(tx, [membership.userProfileId]),
    );
    const profile = profiles[0];
    if (!profile) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const now = new Date().toISOString();
    const email = normalizeInviteEmail(profile.email);

    await ctx.appDb.rls(async (tx) => {
      await organisationMembersRepo.archiveMembership(tx, {
        userOrganisationId: args.userOrganisationId,
        organisationId: orgId,
        updatedAt: now,
      });
      await organisationMembersRepo.archiveVenuesForMember(tx, {
        userOrganisationId: args.userOrganisationId,
        organisationId: orgId,
        updatedAt: now,
      });
      await membersWhitelistRepo.revokeActive(tx, {
        email,
        organisationId: orgId,
        now,
      });
    });

    await authAdmin.auth.admin.signOut(membership.userProfileId, "global");

    trackMembersEvent("permissions.member_archived", {
      organisation_id: orgId,
      user_organisation_id: args.userOrganisationId,
    });
  },

  async reactivateMember(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      userOrganisationId: string;
      venueIds: string[];
      roleSlug?: string;
    },
  ): Promise<void> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    await assertVenueIdsBelongToOrg(ctx, orgId, args.venueIds);

    const membership = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.getMembershipDetail(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const roleSlug = args.roleSlug
      ? normalizeAssignableRoleSlug(args.roleSlug)
      : null;
    const roleId = roleSlug ? PLATFORM_ROLE_IDS[roleSlug] : membership.roleId;
    if (args.roleSlug && !roleSlug) {
      throw new MembersServiceError("permissions.invalid_role", "Invalid role");
    }

    const profiles = await ctx.appDb.rls((tx) =>
      organisationMembersRepo.listProfilesByIds(tx, [membership.userProfileId]),
    );
    const profile = profiles[0];
    if (!profile) {
      throw new MembersServiceError("permissions.not_found", "Member not found", 404);
    }

    const now = new Date().toISOString();
    const email = normalizeInviteEmail(profile.email);

    await ctx.appDb.rls(async (tx) => {
      await organisationMembersRepo.reactivateMembership(tx, {
        id: membership.id,
        organisationId: orgId,
        roleId,
        joinedAt: now,
        updatedAt: now,
      });
      await organisationMembersRepo.reactivateVenuesForMember(tx, {
        userOrganisationId: membership.id,
        organisationId: orgId,
        venueIds: args.venueIds,
        updatedAt: now,
      });
      await membersWhitelistRepo.upsertActive(tx, {
        email,
        organisationId: orgId,
        addedBy: ctx.userId,
        now,
      });
    });

    trackMembersEvent("permissions.member_reactivated", {
      organisation_id: orgId,
      user_organisation_id: args.userOrganisationId,
    });
  },

  /** @deprecated Use membersInviteService.createInvite */
  async addMember(
    ctx: RequestAuthContext,
    authAdmin: AuthAdminClient,
    args: {
      organisationSlug: string;
      email: string;
      roleSlug: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      venueIds: string[];
      redirectTo: string;
    },
  ): Promise<void> {
    await membersInviteService.createInvite(ctx, authAdmin, {
      organisationSlug: args.organisationSlug,
      email: args.email,
      roleSlug: args.roleSlug,
      venueIds: args.venueIds,
      redirectTo: args.redirectTo,
    });
  },

  async updateMemberRole(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      userOrganisationId: string;
      roleSlug: string;
    },
  ): Promise<void> {
    await organisationMembersService.updateMember(ctx, {
      organisationSlug: args.organisationSlug,
      userOrganisationId: args.userOrganisationId,
      roleSlug: args.roleSlug,
    });
  },
};

export { membersInviteService };
