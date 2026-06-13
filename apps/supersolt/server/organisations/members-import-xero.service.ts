import type { RequestAuthContext } from "@/server/auth/context";
import { onboardingRepo } from "@/server/onboarding/onboarding.repo";
import { loadVenueXeroConnectionForVenue } from "@/server/xero/load-venue-xero-connection";
import { MembersServiceError } from "@/server/organisations/members-errors";
import {
  assertOrganisationOwner,
  resolveOrganisationIdBySlug,
} from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { trackMembersEvent } from "@/server/organisations/members-telemetry";

export type XeroEmployeeImportRow = {
  email: string;
  firstName: string;
  lastName: string;
};

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new MembersServiceError("permissions.forbidden", error.message, error.status);
  }
  throw error;
}

export const membersImportXeroService = {
  async listEmployees(
    ctx: RequestAuthContext,
    args: { organisationSlug: string },
  ): Promise<{ employees: XeroEmployeeImportRow[] }> {
    const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug);
    if (!orgId) {
      throw new MembersServiceError("permissions.not_found", "Organisation not found", 404);
    }
    try {
      assertOrganisationOwner(ctx.tenantRoles, orgId);
    } catch (error) {
      mapAuthError(error);
    }

    const venues = await ctx.appDb.rls((tx) =>
      onboardingRepo.listVenuesForOrganisation(tx, orgId),
    );
    const firstVenue = venues[0];
    if (!firstVenue) {
      throw new MembersServiceError(
        "permissions.xero_not_connected",
        "Add a venue before importing from Xero",
      );
    }

    const connection = await loadVenueXeroConnectionForVenue(
      ctx.appDb,
      firstVenue.id,
    );
    if (!connection && process.env.XERO_PAYROLL_MOCK !== "1") {
      throw new MembersServiceError(
        "permissions.xero_not_connected",
        "Connect Xero in Settings → Integrations first",
      );
    }

    if (process.env.XERO_PAYROLL_MOCK === "1") {
      trackMembersEvent("permissions.xero_import", {
        organisation_id: orgId,
        employee_count: 2,
      });
      return {
        employees: [
          {
            email: "demo.staff@example.com",
            firstName: "Demo",
            lastName: "Staff",
          },
          {
            email: "demo.manager@example.com",
            firstName: "Demo",
            lastName: "Manager",
          },
        ],
      };
    }

    // Xero Payroll employee list API wiring deferred — return empty until connected.
    throw new MembersServiceError(
      "permissions.xero_import_empty",
      "No employees returned from Xero. Import manually or try again later.",
    );
  },
};
