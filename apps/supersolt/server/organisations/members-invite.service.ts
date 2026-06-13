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
import { organisationMemberInvitesRepo } from "@/server/organisations/organisation-member-invites.repo";
import { membersWhitelistRepo } from "@/server/organisations/members-whitelist.repo";
import { organisationMembersRepo } from "@/server/organisations/organisation-members.repo";
import { MembersServiceError } from "@/server/organisations/members-errors";
import {
  displayNameFromProfile,
  inviteExpiresAtIso,
  isInviteExpired,
  isValidInviteEmail,
  normalizeAssignableRoleSlug,
  normalizeInviteEmail,
  parseBulkEmails,
  type MemberListRow,
  mergeMembersList,
} from "@/server/organisations/members-policy";
import { trackMembersEvent } from "@/server/organisations/members-telemetry";

type AuthAdminClient = SupabaseClient<Database>;

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

async function sendInviteEmail(
  authAdmin: AuthAdminClient,
  args: { email: string; organisationId: string; roleId: string; redirectTo: string },
): Promise<void> {
  const { error } = await authAdmin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: args.redirectTo,
    data: {
      invited_organisation_id: args.organisationId,
      invited_role_id: args.roleId,
    },
  });
  if (error) {
    throw new MembersServiceError(
      "permissions.email_delivery_failed",
      error.message,
    );
  }
}

export const membersInviteService = {
  async createInvite(
    ctx: RequestAuthContext,
    authAdmin: AuthAdminClient,
    args: {
      organisationSlug: string;
      email: string;
      roleSlug: string;
      venueIds: string[];
      redirectTo: string;
    },
  ): Promise<{ inviteId: string }> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const email = normalizeInviteEmail(args.email);
    if (!isValidInviteEmail(email)) {
      throw new MembersServiceError("permissions.invalid_email", "Valid email is required");
    }

    const roleSlug = normalizeAssignableRoleSlug(args.roleSlug);
    if (!roleSlug) {
      throw new MembersServiceError("permissions.invalid_role", "Invalid role");
    }
    await assertVenueIdsBelongToOrg(ctx, orgId, args.venueIds);

    const roleId = PLATFORM_ROLE_IDS[roleSlug];
    const now = new Date().toISOString();
    const expiresAt = inviteExpiresAtIso();

    const profileId = await organisationMembersRepo.findProfileIdByEmail(
      ctx.appDb,
      email,
    );
    if (profileId) {
      const activeId = await ctx.appDb.rls((tx) =>
        organisationMembersRepo.findActiveMembershipByProfile(tx, {
          userProfileId: profileId,
          organisationId: orgId,
        }),
      );
      if (activeId) {
        throw new MembersServiceError(
          "permissions.duplicate_member",
          "Already a member of this organisation",
        );
      }
    }

    const pending = await ctx.appDb.rls((tx) =>
      organisationMemberInvitesRepo.findPendingByEmail(tx, {
        organisationId: orgId,
        email,
      }),
    );
    if (pending) {
      throw new MembersServiceError(
        "permissions.duplicate_invite",
        "An invite is already pending for this email",
      );
    }

    const inviteId = await ctx.appDb.rls(async (tx) => {
      const id = await organisationMemberInvitesRepo.insert(tx, {
        organisationId: orgId,
        email,
        roleId,
        invitingUserId: ctx.userId,
        venueIds: args.venueIds,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
      await membersWhitelistRepo.upsertActive(tx, {
        email,
        organisationId: orgId,
        addedBy: ctx.userId,
        now,
      });
      return id;
    });

    if (!inviteId) {
      throw new MembersServiceError(
        "permissions.internal_error",
        "Could not create invite",
      );
    }

    try {
      await sendInviteEmail(authAdmin, {
        email,
        organisationId: orgId,
        roleId,
        redirectTo: args.redirectTo,
      });
    } catch (error) {
      if (error instanceof MembersServiceError) {
        throw error;
      }
      throw new MembersServiceError(
        "permissions.email_delivery_failed",
        "Could not send invite email",
      );
    }

    trackMembersEvent("permissions.invite_sent", {
      organisation_id: orgId,
      role_slug: roleSlug,
      venue_count: args.venueIds.length,
    });

    return { inviteId };
  },

  async createBulkInvites(
    ctx: RequestAuthContext,
    authAdmin: AuthAdminClient,
    args: {
      organisationSlug: string;
      emails: string[];
      roleSlug: string;
      venueIds: string[];
      redirectTo: string;
    },
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of args.emails) {
      try {
        await membersInviteService.createInvite(ctx, authAdmin, {
          organisationSlug: args.organisationSlug,
          email: raw,
          roleSlug: args.roleSlug,
          venueIds: args.venueIds,
          redirectTo: args.redirectTo,
        });
        created += 1;
      } catch (error) {
        if (error instanceof MembersServiceError) {
          if (
            error.code === "permissions.duplicate_member" ||
            error.code === "permissions.duplicate_invite"
          ) {
            skipped += 1;
            continue;
          }
          errors.push(`${raw}: ${error.message}`);
          continue;
        }
        errors.push(`${raw}: Invite failed`);
      }
    }

    trackMembersEvent("permissions.invite_bulk", {
      organisation_id: assertOrganisationOwnerBySlug(ctx, args.organisationSlug),
      count: created,
    });

    return { created, skipped, errors };
  },

  async resendInvite(
    ctx: RequestAuthContext,
    authAdmin: AuthAdminClient,
    args: { organisationSlug: string; inviteId: string; redirectTo: string },
  ): Promise<void> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const invite = await ctx.appDb.rls((tx) =>
      organisationMemberInvitesRepo.getById(tx, args.inviteId),
    );
    if (!invite || invite.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Invite not found", 404);
    }
    if (invite.revokedAt) {
      throw new MembersServiceError("permissions.invite_revoked", "Invite was revoked");
    }
    if (invite.acceptedAt) {
      throw new MembersServiceError("permissions.duplicate_member", "Invite already accepted");
    }

    const now = new Date().toISOString();
    const expiresAt = inviteExpiresAtIso();

    await ctx.appDb.rls((tx) =>
      organisationMemberInvitesRepo.updateExpiry(tx, {
        inviteId: invite.id,
        organisationId: orgId,
        expiresAt,
        updatedAt: now,
      }),
    );

    await sendInviteEmail(authAdmin, {
      email: normalizeInviteEmail(invite.email),
      organisationId: orgId,
      roleId: invite.roleId,
      redirectTo: args.redirectTo,
    });

    trackMembersEvent("permissions.invite_resent", {
      organisation_id: orgId,
      invite_id: invite.id,
    });
  },

  async revokeInvite(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; inviteId: string },
  ): Promise<void> {
    const orgId = assertOrganisationOwnerBySlug(ctx, args.organisationSlug);
    const invite = await ctx.appDb.rls((tx) =>
      organisationMemberInvitesRepo.getById(tx, args.inviteId),
    );
    if (!invite || invite.organisationId !== orgId) {
      throw new MembersServiceError("permissions.not_found", "Invite not found", 404);
    }
    if (invite.acceptedAt) {
      throw new MembersServiceError("permissions.duplicate_member", "Invite already accepted");
    }

    const now = new Date().toISOString();
    const email = normalizeInviteEmail(invite.email);

    await ctx.appDb.rls(async (tx) => {
      await organisationMemberInvitesRepo.markRevoked(tx, {
        inviteId: invite.id,
        organisationId: orgId,
        revokedAt: now,
      });
      await membersWhitelistRepo.revokeActive(tx, {
        email,
        organisationId: orgId,
        now,
      });
    });

    trackMembersEvent("permissions.invite_revoked", {
      organisation_id: orgId,
      invite_id: invite.id,
    });
  },

  async acceptPendingInvitesForUser(
    ctx: RequestAuthContext,
    args: { email: string },
  ): Promise<number> {
    const email = normalizeInviteEmail(args.email);
    const pending = await ctx.appDb.rls((tx) =>
      organisationMemberInvitesRepo.listPendingByEmail(tx, email),
    );

    let accepted = 0;
    const now = new Date().toISOString();

    for (const invite of pending) {
      if (isInviteExpired(invite.expiresAt)) {
        continue;
      }

      await ctx.appDb.rls(async (tx) => {
        const existing = await organisationMembersRepo.findLatestMembershipByProfile(tx, {
          userProfileId: ctx.userId,
          organisationId: invite.organisationId,
        });

        let uoId: string;
        if (existing && existing.archivedAt != null) {
          await organisationMembersRepo.reactivateMembership(tx, {
            id: existing.id,
            organisationId: invite.organisationId,
            roleId: invite.roleId,
            joinedAt: now,
            updatedAt: now,
          });
          uoId = existing.id;
        } else if (existing?.isActive) {
          uoId = existing.id;
        } else {
          await organisationMembersRepo.insertMembership(tx, {
            userProfileId: ctx.userId,
            organisationId: invite.organisationId,
            roleId: invite.roleId,
            isActive: true,
            joinedAt: now,
          });
          const row = await organisationMembersRepo.findLatestMembershipByProfile(tx, {
            userProfileId: ctx.userId,
            organisationId: invite.organisationId,
          });
          if (!row) {
            throw new Error("membership insert failed");
          }
          uoId = row.id;
        }

        await organisationMembersRepo.replaceVenueAssignments(tx, {
          userOrganisationId: uoId,
          organisationId: invite.organisationId,
          venueIds: invite.venueIds ?? [],
          updatedAt: now,
        });

        await organisationMemberInvitesRepo.markAccepted(tx, {
          inviteId: invite.id,
          organisationId: invite.organisationId,
          acceptedAt: now,
        });

        await membersWhitelistRepo.upsertActive(tx, {
          email,
          organisationId: invite.organisationId,
          addedBy: invite.invitingUserId,
          now,
        });
      });

      accepted += 1;
    }

    return accepted;
  },

  parseBulkPaste(raw: string) {
    return parseBulkEmails(raw);
  },
};

export type { MemberListRow };

export async function buildMembersList(
  ctx: RequestAuthContext,
  organisationId: string,
): Promise<{ members: MemberListRow[]; venues: Array<{ id: string; name: string }> }> {
  const [uoRows, pendingInvites, orgVenues] = await ctx.appDb.rls((tx) =>
    Promise.all([
      organisationMembersRepo.listAllMembers(tx, organisationId),
      organisationMemberInvitesRepo.listPendingForOrganisation(tx, organisationId),
      onboardingRepo.listVenuesForOrganisation(tx, organisationId),
    ]),
  );

  const uoIds = uoRows.map((r) => r.id);
  const profileIds = [...new Set(uoRows.map((r) => r.userProfileId))];
  const roleIds = [
    ...new Set([
      ...uoRows.map((r) => r.roleId),
      ...pendingInvites.map((i) => i.roleId),
    ]),
  ];

  const uvRows =
    uoIds.length > 0
      ? await ctx.appDb.rls((tx) =>
          organisationMembersRepo.listVenueAssignmentsForMembers(tx, {
            organisationId,
            userOrganisationIds: uoIds,
          }),
        )
      : [];

  const [profiles, roleRows] = await ctx.appDb.rls((tx) =>
    Promise.all([
      organisationMembersRepo.listProfilesByIds(tx, profileIds),
      organisationMembersRepo.listRolesByIds(tx, roleIds),
    ]),
  );

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const roleById = new Map(roleRows.map((r) => [r.id, r]));

  const venuesByUo = new Map<string, string[]>();

  for (const uoId of uoIds) {
    const activeVenueIds = uvRows
      .filter(
        (uv) =>
          uv.userOrganisationId === uoId &&
          uv.archivedAt == null &&
          uv.isActive,
      )
      .map((uv) => uv.venueId);
    venuesByUo.set(uoId, activeVenueIds);
  }

  const memberRows: MemberListRow[] = [];
  for (const uo of uoRows) {
    const profile = profileById.get(uo.userProfileId);
    const role = roleById.get(uo.roleId);
    if (!profile || !role) continue;

    const status: MemberListRow["status"] =
      uo.archivedAt != null || !uo.isActive ? "archived" : "active";

    memberRows.push({
      kind: "member",
      id: uo.id,
      userProfileId: uo.userProfileId,
      name: displayNameFromProfile(profile),
      email: profile.email,
      roleSlug: role.slug,
      roleDisplayName: role.displayName,
      venueIds: venuesByUo.get(uo.id) ?? [],
      status,
      positionDisplayName: null,
      expiresAt: null,
    });
  }

  const inviteRows: MemberListRow[] = pendingInvites.map((invite) => {
    const role = roleById.get(invite.roleId);
    const email = normalizeInviteEmail(invite.email);
    const expired = isInviteExpired(invite.expiresAt);
    return {
      kind: "invite" as const,
      id: invite.id,
      userProfileId: null,
      name: email.split("@")[0] ?? email,
      email,
      roleSlug: role?.slug ?? "crew",
      roleDisplayName: role?.displayName ?? "Staff",
      venueIds: invite.venueIds ?? [],
      status: expired ? ("archived" as const) : ("pending" as const),
      positionDisplayName: null,
      expiresAt: invite.expiresAt,
    };
  });

  return {
    members: mergeMembersList({ members: memberRows, invites: inviteRows }),
    venues: orgVenues.map((v) => ({ id: v.id, name: v.name })),
  };
}
