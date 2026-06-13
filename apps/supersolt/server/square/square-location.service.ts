import type { RequestAuthContext } from "@/server/auth/context";
import { isOrganisationAdmin } from "@/server/auth/rbac";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import {
  listSquareLocations,
  type SquareLocationSummary,
} from "@/server/square/list-locations";

export class SquareLocationServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new SquareLocationServiceError(404, message),
    forbidden: (auth) => new SquareLocationServiceError(auth.status, auth.message),
  });
}

function assertOrgAdmin(ctx: RequestAuthContext, organisationId: string) {
  if (!isOrganisationAdmin(ctx.tenantRoles, organisationId)) {
    throw new SquareLocationServiceError(403, "Org admin required");
  }
}

async function loadConnectionOrThrow(
  ctx: RequestAuthContext,
  venueId: string,
): Promise<{
  squareAccessToken: string;
  environment: string;
  squareLocationId: string | null;
}> {
  const connection = await squareConnectionsRepo.loadConnectionForVenue(
    ctx.appDb,
    venueId,
    true,
  );
  if (!connection?.squareAccessToken) {
    throw new SquareLocationServiceError(
      400,
      "Square is not connected for this venue",
    );
  }
  return connection;
}

export const squareLocationService = {
  async listForVenue(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<{
    locations: SquareLocationSummary[];
    currentLocationId: string | null;
  }> {
    const scope = await resolveVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    assertOrgAdmin(ctx, scope.organisationId);

    const connection = await loadConnectionOrThrow(ctx, scope.venueId);
    const listed = await listSquareLocations({
      accessToken: connection.squareAccessToken,
      storedEnvironment: connection.environment,
    });
    if (!listed.ok) {
      throw new SquareLocationServiceError(listed.status, listed.message);
    }

    return {
      locations: listed.locations,
      currentLocationId: connection.squareLocationId?.trim() || null,
    };
  },

  async setForVenue(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      locationId: string;
    },
  ): Promise<{ locationId: string }> {
    const scope = await resolveVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    assertOrgAdmin(ctx, scope.organisationId);

    const locationId = args.locationId.trim();
    if (!locationId) {
      throw new SquareLocationServiceError(400, "Location id is required");
    }

    const connection = await loadConnectionOrThrow(ctx, scope.venueId);
    const listed = await listSquareLocations({
      accessToken: connection.squareAccessToken,
      storedEnvironment: connection.environment,
    });
    if (!listed.ok) {
      throw new SquareLocationServiceError(listed.status, listed.message);
    }

    const match = listed.locations.find((location) => location.id === locationId);
    if (!match) {
      throw new SquareLocationServiceError(
        400,
        "That Square location is not available for this account",
      );
    }

    await squareConnectionsRepo.updateLocationId(ctx.appDb, {
      venueId: scope.venueId,
      squareLocationId: locationId,
    });

    return { locationId };
  },
};
