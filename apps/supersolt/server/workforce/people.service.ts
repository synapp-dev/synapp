import type { RequestAuthContext } from "@/server/auth/context";
import { isOrganisationAdminForOrg } from "@/server/auth/capabilities";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { organisationMembersRepo } from "@/server/organisations/organisation-members.repo";
import { membersInviteService } from "@/server/organisations/members-invite.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import {
  computeComplianceStatus,
  type ComplianceStatus,
  type PeopleWarning,
} from "@/server/workforce/people-compliance";
import { PeopleServiceError } from "@/server/workforce/people-errors";

export { PeopleServiceError } from "@/server/workforce/people-errors";
export type { PeopleErrorCode } from "@/server/workforce/people-errors";
import {
  canManagePeople,
  canViewEmployeeSensitive,
  requiresAwardOverrideReason,
} from "@/server/workforce/people-policy";
import { peopleRepo } from "@/server/workforce/people.repo";
import { trackPeopleEvent } from "@/server/workforce/people-telemetry";
import { eq } from "drizzle-orm";
import { userOrganisations, userProfiles } from "@/server/db/schema";

export type PeopleRoleTier = "manager" | "supervisor" | "crew" | "custom";

/** @deprecated Prefer PeopleListItem — kept for roster/availability consumers. */
export type VenueStaffMember = {
  id: string;
  userOrganisationId?: string;
  name: string;
  email: string;
  phone: string | null;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  roleTier: PeopleRoleTier;
  positionSlug: string | null;
  positionDisplayName: string | null;
  startDate: string;
  status: "active" | "inactive";
  employmentStatus?: string;
  complianceStatus?: ComplianceStatus;
};

export type PeopleListItem = VenueStaffMember & {
  userOrganisationId: string;
  employmentType: string;
  needsSupersoltDetail: boolean;
  complianceStatus: ComplianceStatus;
  warnings: PeopleWarning[];
};

export type PeopleDetailDto = PeopleListItem & {
  preferredName: string | null;
  dateOfBirth: string | null;
  continuousServiceStartDate: string | null;
  awardCode: string | null;
  classificationLevel: string | null;
  classificationGrade: string | null;
  payRateCents: number | null;
  payRatePeriod: string;
  fwisIssuedDate: string | null;
  ceisIssuedDate: string | null;
  venueIds: string[];
  sensitive?: Record<string, unknown> | null;
};

function roleTierFromSlug(slug: string): PeopleRoleTier {
  if (slug === "supervisor") return "supervisor";
  if (slug === "crew") return "crew";
  if (slug === "owner" || slug === "admin" || slug === "manager") return "manager";
  return "custom";
}

function displayName(profile: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  preferredName?: string | null;
  email: string;
}): string {
  if (profile.preferredName?.trim()) return profile.preferredName.trim();
  if (profile.fullName?.trim()) return profile.fullName.trim();
  const first = profile.firstName?.trim() ?? "";
  const last = profile.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return profile.email;
}

function resolveOrgId(ctx: RequestAuthContext, organisationSlug: string): string {
  const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!orgId) {
    throw new PeopleServiceError(404, "Organisation not found", "not_found");
  }
  return orgId;
}

function assertCanAccessOrg(ctx: RequestAuthContext, organisationId: string): void {
  const member = ctx.tenantRoles.organisations.some(
    (o) => o.organisationId === organisationId,
  );
  if (!member) {
    throw new PeopleServiceError(403, "Forbidden", "forbidden");
  }
}

async function buildListItems(
  ctx: RequestAuthContext,
  organisationId: string,
  rows: Awaited<ReturnType<typeof peopleRepo.listMembershipsForOrganisation>>,
): Promise<PeopleListItem[]> {
  if (rows.length === 0) return [];

  const profileIds = [...new Set(rows.map((r) => r.userProfileId))];
  const roleIdSet = new Set<string>();
  for (const r of rows) {
    roleIdSet.add(r.roleId);
    if (r.venueRoleId) roleIdSet.add(r.venueRoleId);
  }

  const positionIdSet = new Set(
    rows.map((r) => r.defaultPositionId).filter((id): id is string => Boolean(id)),
  );

  const [profiles, roleRows, payrollRows, positionRows] = await ctx.appDb.rls((tx) =>
    Promise.all([
      workforceRepo.listProfilesByIds(tx, profileIds),
      peopleRepo.listRolesByIds(tx, [...roleIdSet]),
      Promise.all(
        profileIds.map((pid) =>
          peopleRepo.getPayrollProfile(tx, { organisationId, userProfileId: pid }),
        ),
      ),
      positionIdSet.size > 0
        ? workforceRepo.listPositionsByIds(tx, [...positionIdSet])
        : Promise.resolve([]),
    ]),
  );

  const roleById = new Map(roleRows.map((r) => [r.id, r]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const positionById = new Map(
    positionRows.map((p) => [p.id, { slug: p.slug, displayName: p.displayName }]),
  );
  const payrollByProfileId = new Map(
    profileIds.map((pid, i) => [pid, payrollRows[i] ?? null]),
  );

  const items: PeopleListItem[] = [];

  for (const row of rows) {
    const profile = profileById.get(row.userProfileId);
    if (!profile) continue;

    const orgRole = roleById.get(row.roleId);
    if (!orgRole) continue;

    const venueRole = row.venueRoleId ? roleById.get(row.venueRoleId) : null;
    const effective = venueRole ?? orgRole;
    const positionRow = row.defaultPositionId
      ? positionById.get(row.defaultPositionId)
      : null;

    const payroll = payrollByProfileId.get(row.userProfileId);
    const { status: complianceStatus, warnings } = computeComplianceStatus({
      fwisIssuedDate: row.fwisIssuedDate,
      ceisIssuedDate: row.ceisIssuedDate,
      employmentType: row.employmentType,
      lastVevoCheckDate: payroll?.lastVevoCheckDate ?? null,
      vevoReference: payroll?.vevoReference ?? null,
      visaSubclass: payroll?.visaSubclass ?? null,
      tfnStatus: payroll?.tfnStatus ?? null,
      superFundUsi: payroll?.superFundUsi ?? null,
      taxTreatmentCode: payroll?.taxTreatmentCode ?? null,
      employmentStatus: row.employmentStatus,
    });

    const startDate =
      row.startDate ??
      (row.joinedAt ? row.joinedAt.slice(0, 10) : row.createdAt.slice(0, 10));

    const activeProfile = profile.isActive && profile.archivedAt == null;
    const listStatus: "active" | "inactive" =
      activeProfile && row.employmentStatus === "active" ? "active" : "inactive";

    items.push({
      id: profile.id,
      userOrganisationId: row.userOrganisationId,
      name: displayName(profile),
      email: profile.email,
      phone: profile.phone ?? null,
      roleSlug: effective.slug,
      roleDisplayName: effective.displayName,
      grantsOrgAdmin: effective.grantsOrgAdmin,
      roleTier: roleTierFromSlug(effective.slug),
      positionSlug: positionRow?.slug ?? null,
      positionDisplayName: positionRow?.displayName ?? null,
      startDate,
      status: listStatus,
      employmentType: row.employmentType,
      needsSupersoltDetail: row.needsSupersoltDetail,
      complianceStatus,
      warnings,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export const peopleService = {
  async listForOrganisation(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueId?: string;
      venueSlug?: string;
    },
  ): Promise<{ employees: PeopleListItem[]; statusCounts: Record<string, number> }> {
    const orgId = resolveOrgId(ctx, args.organisationSlug);
    assertCanAccessOrg(ctx, orgId);

    let venueId = args.venueId;
    if (!venueId && args.venueSlug) {
      const scope = await resolveVenueScopeForService(
        ctx,
        args.organisationSlug,
        args.venueSlug,
        {
          notFound: (message) => new PeopleServiceError(404, message, "not_found"),
          forbidden: (auth) => new PeopleServiceError(auth.status, auth.message, "forbidden"),
        },
      );
      venueId = scope.venueId;
    }

    const rows = await ctx.appDb.rls((tx) =>
      peopleRepo.listMembershipsForOrganisation(tx, {
        organisationId: orgId,
        venueId,
      }),
    );

    const employees = await buildListItems(ctx, orgId, rows);
    trackPeopleEvent("people.viewed", {
      organisation_id: orgId,
      venue_id: args.venueId ?? null,
    });

    const statusCounts = employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});

    return { employees, statusCounts };
  },

  async listForVenue(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
    },
  ): Promise<{ staff: VenueStaffMember[] }> {
    const context = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (message) => new PeopleServiceError(404, message, "not_found"),
        forbidden: (auth) => new PeopleServiceError(auth.status, auth.message, "forbidden"),
      },
    );

    const { employees } = await peopleService.listForOrganisation(ctx, {
      organisationSlug: args.organisationSlug,
      venueId: context.venueId,
    });

    return { staff: employees };
  },

  async getEmployee(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; userOrganisationId: string },
  ): Promise<PeopleDetailDto> {
    const orgId = resolveOrgId(ctx, args.organisationSlug);
    assertCanAccessOrg(ctx, orgId);

    const membership = await ctx.appDb.rls((tx) =>
      peopleRepo.getMembershipById(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new PeopleServiceError(404, "Employee not found", "not_found");
    }

    const isSelf = membership.userProfileId === ctx.userId;
    if (!isSelf && !canManagePeople(ctx.tenantRoles, orgId)) {
      const venueIds = await ctx.appDb.rls((tx) =>
        peopleRepo.listVenueIdsForMember(tx, membership.id),
      );
      const canSeeVenue = venueIds.some((v) =>
        ctx.tenantRoles.organisations
          .find((o) => o.organisationId === orgId)
          ?.venues.some((uv) => uv.venueId === v.venueId),
      );
      if (!canSeeVenue && !isOrganisationAdminForOrg(ctx.tenantRoles, orgId)) {
        throw new PeopleServiceError(403, "Forbidden", "forbidden");
      }
    }

    const [list] = await buildListItems(ctx, orgId, [
      {
        userOrganisationId: membership.id,
        userProfileId: membership.userProfileId,
        roleId: membership.roleId,
        employmentType: membership.employmentType,
        employmentStatus: membership.employmentStatus,
        startDate: membership.startDate,
        payRateCents: membership.payRateCents,
        awardCode: membership.awardCode,
        needsSupersoltDetail: membership.needsSupersoltDetail,
        fwisIssuedDate: membership.fwisIssuedDate,
        ceisIssuedDate: membership.ceisIssuedDate,
        joinedAt: membership.joinedAt,
        createdAt: membership.createdAt,
        defaultPositionId: null,
        venueRoleId: null,
      },
    ]);

    if (!list) {
      throw new PeopleServiceError(404, "Employee not found", "not_found");
    }

    const profile = await ctx.appDb.rls((tx) =>
      peopleRepo.getProfile(tx, membership.userProfileId),
    );
    if (!profile) {
      throw new PeopleServiceError(404, "Employee not found", "not_found");
    }

    const payroll = await ctx.appDb.rls((tx) =>
      peopleRepo.getPayrollProfile(tx, {
        organisationId: orgId,
        userProfileId: membership.userProfileId,
      }),
    );

    const venueRows = await ctx.appDb.rls((tx) =>
      peopleRepo.listVenueIdsForMember(tx, membership.id),
    );

    let sensitive: Record<string, unknown> | null = null;
    if (canViewEmployeeSensitive(ctx.tenantRoles, orgId, membership.userProfileId, ctx.userId)) {
      if (payroll) {
        sensitive = {
          tfnStatus: payroll.tfnStatus,
          superFundUsi: payroll.superFundUsi,
          superMemberNumber: payroll.superMemberNumber,
          bankBsb: payroll.bankBsb,
          bankAccountNumber: payroll.bankAccountNumber,
          bankAccountName: payroll.bankAccountName,
          taxTreatmentCode: payroll.taxTreatmentCode,
          stp2IncomeType: payroll.stp2IncomeType,
          visaSubclass: payroll.visaSubclass,
          countryCode: payroll.countryCode,
          visaExpiry: payroll.visaExpiry,
          lastVevoCheckDate: payroll.lastVevoCheckDate,
          vevoReference: payroll.vevoReference,
          hasTfn: Boolean(payroll.tfn),
        };
        trackPeopleEvent("people.sensitive_access", { organisation_id: orgId });
      }
    }

    return {
      ...list,
      preferredName: profile.preferredName ?? null,
      dateOfBirth: profile.dateOfBirth ?? payroll?.dateOfBirth ?? null,
      continuousServiceStartDate: membership.continuousServiceStartDate,
      awardCode: membership.awardCode,
      classificationLevel: membership.classificationLevel,
      classificationGrade: membership.classificationGrade,
      payRateCents: membership.payRateCents,
      payRatePeriod: membership.payRatePeriod,
      fwisIssuedDate: membership.fwisIssuedDate,
      ceisIssuedDate: membership.ceisIssuedDate,
      venueIds: venueRows.map((v) => v.venueId),
      sensitive,
    };
  },

  async updateEmployee(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      userOrganisationId: string;
      patch: {
        firstName?: string;
        lastName?: string;
        preferredName?: string | null;
        phone?: string | null;
        startDate?: string;
        continuousServiceStartDate?: string;
        employmentType?: "full_time" | "part_time" | "casual" | "fixed_term";
        awardCode?: string | null;
        classificationLevel?: string | null;
        classificationGrade?: string | null;
        payRateCents?: number;
        payRatePeriod?: string;
        fwisIssuedDate?: string | null;
        ceisIssuedDate?: string | null;
        awardOverrideReason?: string | null;
      };
    },
  ): Promise<{
    employee: PeopleDetailDto;
    complianceStatus: ComplianceStatus;
    warnings: PeopleWarning[];
  }> {
    const orgId = resolveOrgId(ctx, args.organisationSlug);
    const membership = await ctx.appDb.rls((tx) =>
      peopleRepo.getMembershipById(tx, args.userOrganisationId),
    );
    if (!membership || membership.organisationId !== orgId) {
      throw new PeopleServiceError(404, "Employee not found", "not_found");
    }

    const isSelf = membership.userProfileId === ctx.userId;
    if (!isSelf && !canManagePeople(ctx.tenantRoles, orgId)) {
      throw new PeopleServiceError(403, "Forbidden", "forbidden");
    }

    if (
      args.patch.payRateCents != null &&
      requiresAwardOverrideReason({
        newRateCents: args.patch.payRateCents,
        minimumRateCents: null,
        overrideReason: args.patch.awardOverrideReason,
      })
    ) {
      throw new PeopleServiceError(
        422,
        "Pay rate is below award minimum; override reason is required.",
        "award_minimum_override_required",
      );
    }

    const now = new Date().toISOString();

    await ctx.appDb.rls(async (tx) => {
      if (
        args.patch.firstName != null ||
        args.patch.lastName != null ||
        args.patch.preferredName !== undefined ||
        args.patch.phone !== undefined
      ) {
        const profile = await peopleRepo.getProfile(tx, membership.userProfileId);
        if (profile) {
          const firstName = args.patch.firstName ?? profile.firstName ?? "";
          const lastName = args.patch.lastName ?? profile.lastName ?? "";
          const fullName = `${firstName} ${lastName}`.trim();
          await tx
            .update(userProfiles)
            .set({
              ...(args.patch.firstName != null ? { firstName: args.patch.firstName } : {}),
              ...(args.patch.lastName != null ? { lastName: args.patch.lastName } : {}),
              ...(args.patch.preferredName !== undefined
                ? { preferredName: args.patch.preferredName }
                : {}),
              ...(args.patch.phone !== undefined ? { phone: args.patch.phone } : {}),
              ...(args.patch.firstName != null || args.patch.lastName != null
                ? { fullName: fullName || profile.email }
                : {}),
              updatedAt: now,
            })
            .where(eq(userProfiles.id, membership.userProfileId));
        }
      }

      const hasUoPatch =
        args.patch.startDate != null ||
        args.patch.continuousServiceStartDate != null ||
        args.patch.employmentType != null ||
        args.patch.awardCode !== undefined ||
        args.patch.classificationLevel !== undefined ||
        args.patch.classificationGrade !== undefined ||
        args.patch.payRateCents != null ||
        args.patch.payRatePeriod != null ||
        args.patch.fwisIssuedDate !== undefined ||
        args.patch.ceisIssuedDate !== undefined;

      if (hasUoPatch) {
        await tx
          .update(userOrganisations)
          .set({
            updatedAt: now,
            ...(args.patch.startDate ? { startDate: args.patch.startDate } : {}),
            ...(args.patch.continuousServiceStartDate
              ? { continuousServiceStartDate: args.patch.continuousServiceStartDate }
              : {}),
            ...(args.patch.employmentType
              ? { employmentType: args.patch.employmentType }
              : {}),
            ...(args.patch.awardCode !== undefined ? { awardCode: args.patch.awardCode } : {}),
            ...(args.patch.classificationLevel !== undefined
              ? { classificationLevel: args.patch.classificationLevel }
              : {}),
            ...(args.patch.classificationGrade !== undefined
              ? { classificationGrade: args.patch.classificationGrade }
              : {}),
            ...(args.patch.payRateCents != null
              ? { payRateCents: args.patch.payRateCents }
              : {}),
            ...(args.patch.payRatePeriod
              ? { payRatePeriod: args.patch.payRatePeriod }
              : {}),
            ...(args.patch.fwisIssuedDate !== undefined
              ? { fwisIssuedDate: args.patch.fwisIssuedDate }
              : {}),
            ...(args.patch.ceisIssuedDate !== undefined
              ? { ceisIssuedDate: args.patch.ceisIssuedDate }
              : {}),
          })
          .where(eq(userOrganisations.id, membership.id));
      }

      await peopleRepo.upsertPayrollProfileShell(tx, {
        organisationId: orgId,
        userProfileId: membership.userProfileId,
      });
    });

    const employee = await peopleService.getEmployee(ctx, {
      organisationSlug: args.organisationSlug,
      userOrganisationId: args.userOrganisationId,
    });

    if (employee.warnings.length > 0) {
      trackPeopleEvent("people.compliance_warning", {
        organisation_id: orgId,
        codes: employee.warnings.map((w) => w.code),
      });
    }

    return {
      employee,
      complianceStatus: employee.complianceStatus,
      warnings: employee.warnings,
    };
  },

  async createEmployeeInvite(
    ctx: RequestAuthContext,
    authAdmin: SupabaseClient<Database>,
    args: {
      organisationSlug: string;
      email: string;
      roleSlug: string;
      venueIds: string[];
      redirectTo: string;
      employment?: {
        startDate?: string;
        employmentType?: "full_time" | "part_time" | "casual" | "fixed_term";
        awardCode?: string;
      };
    },
  ): Promise<{ inviteId: string }> {
    const orgId = resolveOrgId(ctx, args.organisationSlug);
    if (!canManagePeople(ctx.tenantRoles, orgId)) {
      throw new PeopleServiceError(403, "Forbidden", "forbidden");
    }

    const existing = await organisationMembersRepo.findProfileIdByEmail(
      ctx.appDb,
      args.email.trim().toLowerCase(),
    );
    if (existing) {
      const active = await ctx.appDb.rls((tx) =>
        organisationMembersRepo.findActiveMembershipByProfile(tx, {
          userProfileId: existing,
          organisationId: orgId,
        }),
      );
      if (active) {
        throw new PeopleServiceError(
          422,
          "An employee with this email already exists in this organisation.",
          "duplicate_email",
        );
      }
    }

    const result = await membersInviteService.createInvite(ctx, authAdmin, {
      organisationSlug: args.organisationSlug,
      email: args.email,
      roleSlug: args.roleSlug,
      venueIds: args.venueIds,
      redirectTo: args.redirectTo,
    });

    trackPeopleEvent("people.employee_created", {
      organisation_id: orgId,
      employment_type: args.employment?.employmentType ?? "casual",
    });

    return result;
  },

  async getPayrollProfile(
    ctx: RequestAuthContext,
    organisationId: string,
    userProfileId: string,
  ) {
    return ctx.appDb.rls((tx) =>
      peopleRepo.getPayrollProfile(tx, { organisationId, userProfileId }),
    );
  },
};
