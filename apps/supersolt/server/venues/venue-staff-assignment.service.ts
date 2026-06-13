import type { RequestAuthContext } from "@/server/auth/context";
import {
  assertOrganisationAdmin,
  resolveOrganisationIdBySlug,
} from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { PLATFORM_ROLE_IDS, type PlatformRoleSlug } from "@/lib/roles/platform-role-ids";
import { venuesRepo } from "@/server/venues/venues.repo";

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

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new VenueStaffAssignmentError(error.status, error.message);
  }
  throw error;
}

function isVenueRoleSlug(value: string): value is VenueAssignableRoleSlug {
  return (VENUE_ROLE_SLUGS as readonly string[]).includes(value);
}

function displayName(profile: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  if (profile.fullName?.trim()) return profile.fullName.trim();
  const first = profile.firstName?.trim() ?? "";
  const last = profile.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return profile.email;
}

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

async function resolveAdminVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
): Promise<{ orgId: string; venueId: string }> {
  const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!orgId) {
    throw new VenueStaffAssignmentError(404, "Organisation not found");
  }

  try {
    assertOrganisationAdmin(ctx.tenantRoles, orgId);
  } catch (error) {
    mapAuthError(error);
  }

  const venueId = await ctx.appDb.rls((tx) =>
    venuesRepo.getVenueIdBySlug(tx, { organisationId: orgId, venueSlug }),
  );
  if (!venueId) {
    throw new VenueStaffAssignmentError(404, "Venue not found");
  }

  return { orgId, venueId };
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

export const venueStaffAssignmentService = {
  async listOrgMembersForVenue(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
    },
  ): Promise<{ venueId: string; members: OrgMemberVenueRow[] }> {
    const { orgId, venueId } = await resolveAdminVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const uoRows = await ctx.appDb.rls((tx) =>
      venuesRepo.listActiveOrgMembers(tx, orgId),
    );

    if (uoRows.length === 0) {
      return { venueId, members: [] };
    }

    const profileIds = [...new Set(uoRows.map((r) => r.userProfileId))];
    const orgRoleIds = [...new Set(uoRows.map((r) => r.roleId))];
    const uoIds = uoRows.map((r) => r.id);

    const uvRows = await ctx.appDb.rls((tx) =>
      venuesRepo.listUserVenuesForMembers(tx, {
        organisationId: orgId,
        venueId,
        userOrganisationIds: uoIds,
      }),
    );

    const uvByUoId = new Map<string, { roleId: string | null; active: boolean }>();
    for (const uv of uvRows) {
      const active = uv.archivedAt == null && uv.isActive;
      const prev = uvByUoId.get(uv.userOrganisationId);
      if (prev == null) {
        uvByUoId.set(uv.userOrganisationId, { roleId: uv.roleId, active });
      } else if (active) {
        uvByUoId.set(uv.userOrganisationId, { roleId: uv.roleId, active: true });
      } else if (!prev.active) {
        uvByUoId.set(uv.userOrganisationId, { roleId: uv.roleId, active: false });
      }
    }

    const venueRoleIds = new Set<string>();
    for (const uv of uvRows) {
      if (uv.roleId) venueRoleIds.add(uv.roleId);
    }

    const allRoleIds = [...new Set([...orgRoleIds, ...venueRoleIds])];

    const [profiles, roleRows] = await ctx.appDb.rls((tx) =>
      Promise.all([
        venuesRepo.listProfilesByIds(tx, profileIds),
        venuesRepo.listRolesByIds(tx, allRoleIds),
      ]),
    );

    const roleById = new Map(
      roleRows.map((r) => [r.id, { slug: r.slug, displayName: r.displayName }]),
    );
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    const members: OrgMemberVenueRow[] = uoRows
      .map((uo) => {
        const profile = profileById.get(uo.userProfileId);
        const orgRole = roleById.get(uo.roleId);
        if (!profile || !orgRole) return null;

        const uv = uvByUoId.get(uo.id);
        const hasVenueAccess = Boolean(uv?.active);
        const venueRoleId = uv?.roleId ?? null;
        const venueRole = venueRoleId ? roleById.get(venueRoleId) : null;

        return {
          userOrganisationId: uo.id,
          userProfileId: uo.userProfileId,
          name: displayName(profile),
          email: profile.email,
          orgRoleSlug: orgRole.slug,
          orgRoleDisplayName: orgRole.displayName,
          hasVenueAccess,
          venueRoleSlug: venueRole?.slug ?? null,
        };
      })
      .filter((m): m is OrgMemberVenueRow => m !== null);

    members.sort((a, b) => a.name.localeCompare(b.name));
    return { venueId, members };
  },

  async assignVenueAccess(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      userOrganisationIds: string[];
      venueRoleSlug?: string | null;
    },
  ): Promise<{ linked: number; skipped: number }> {
    const { orgId, venueId } = await resolveAdminVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const roleId = resolveVenueRoleId(args.venueRoleSlug);

    const ids = [...new Set(args.userOrganisationIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new VenueStaffAssignmentError(400, "No members selected");
    }

    let linked = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const uoId of ids) {
      const uo = await ctx.appDb.rls((tx) =>
        venuesRepo.getUserOrganisation(tx, uoId),
      );
      if (!uo || uo.organisationId !== orgId) {
        throw new VenueStaffAssignmentError(400, "Invalid membership selection");
      }

      const existingUv = await ctx.appDb.rls((tx) =>
        venuesRepo.findLatestUserVenueMapping(tx, {
          userOrganisationId: uoId,
          venueId,
          organisationId: orgId,
        }),
      );

      const alreadyActive =
        existingUv != null && existingUv.archivedAt == null && existingUv.isActive;

      if (alreadyActive) {
        skipped += 1;
        continue;
      }

      if (existingUv) {
        await ctx.appDb.rls((tx) =>
          venuesRepo.reactivateUserVenue(tx, {
            id: existingUv.id,
            organisationId: orgId,
            roleId,
            updatedAt: now,
          }),
        );
        linked += 1;
        continue;
      }

      await ctx.appDb.rls((tx) =>
        venuesRepo.insertUserVenue(tx, {
          userOrganisationId: uoId,
          organisationId: orgId,
          venueId,
          roleId,
          isActive: true,
        }),
      );
      linked += 1;
    }

    return { linked, skipped };
  },
};
