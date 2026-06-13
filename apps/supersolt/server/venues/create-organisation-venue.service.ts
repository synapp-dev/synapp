import type { RequestAuthContext } from "@/server/auth/context";
import {
  assertOrganisationOwner,
  resolveOrganisationIdBySlug,
} from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import type { CreatedOrganisationVenueDto } from "@/entities/venues/model/types";
import { ensureUniqueVenueSlug } from "@/server/onboarding/unique-slugs";
import { PLATFORM_OWNER_ROLE_ID } from "@/server/onboarding/constants";
import { venuesRepo } from "@/server/venues/venues.repo";

export class CreateOrganisationVenueError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CreateOrganisationVenueError";
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new CreateOrganisationVenueError(error.message, error.status);
  }
  throw error;
}

export async function createOrganisationVenueForOwner(
  ctx: RequestAuthContext,
  input: {
    organisationSlug: string;
    name: string;
    addressLine1?: string | null;
    timezone?: string;
  },
): Promise<CreatedOrganisationVenueDto> {
  const organisationSlug = input.organisationSlug.trim();
  if (!organisationSlug) {
    throw new CreateOrganisationVenueError("Organisation slug is required", 400);
  }

  const venueName = input.name.trim();
  if (!venueName) {
    throw new CreateOrganisationVenueError("Venue name is required", 400);
  }

  const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!orgId) {
    throw new CreateOrganisationVenueError("Organisation not found", 404);
  }

  try {
    assertOrganisationOwner(ctx.tenantRoles, orgId);
  } catch (error) {
    mapAuthError(error);
  }

  const org = await ctx.appDb.rls((tx) =>
    venuesRepo.getOrganisationBySlug(tx, organisationSlug),
  );
  if (!org) {
    throw new CreateOrganisationVenueError("Organisation not found", 404);
  }

  const membership = await ctx.appDb.rls((tx) =>
    venuesRepo.getOwnerMembership(tx, {
      userId: ctx.userId,
      organisationId: org.id,
      ownerRoleId: PLATFORM_OWNER_ROLE_ID,
    }),
  );
  if (!membership) {
    throw new CreateOrganisationVenueError(
      "Only organisation owners can create venues",
      403,
    );
  }

  const slug = await ensureUniqueVenueSlug(ctx.appDb, org.id, venueName);
  const timezone = input.timezone?.trim() || "Australia/Melbourne";

  const venue = await ctx.appDb.rls((tx) =>
    venuesRepo.insertVenue(tx, {
      organisationId: org.id,
      name: venueName,
      slug,
      addressLine1: input.addressLine1?.trim() || null,
      timezone,
    }),
  );

  await ctx.appDb.rls((tx) =>
    venuesRepo.insertUserVenue(tx, {
      userOrganisationId: membership.id,
      organisationId: org.id,
      venueId: venue.id,
      roleId: PLATFORM_OWNER_ROLE_ID,
    }),
  );

  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    organisationSlug: org.slug,
  };
}
