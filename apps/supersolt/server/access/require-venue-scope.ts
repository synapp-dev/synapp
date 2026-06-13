import type { RequestAuthContext } from "@/server/auth/context";
import { assertVenueMember } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { scopeRepo, type VenueScope } from "@/server/db/scope.repo";

export class VenueScopeNotFoundError extends Error {
  readonly status = 404;

  constructor(message = "Venue not found") {
    super(message);
    this.name = "VenueScopeNotFoundError";
  }
}

export async function requireVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
): Promise<VenueScope> {
  const scope = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisationSlug, venueSlug),
  );
  if (!scope) {
    throw new VenueScopeNotFoundError();
  }

  assertVenueMember(ctx.tenantRoles, {
    organisationId: scope.organisationId,
    venueId: scope.venueId,
  });

  return scope;
}

export function rethrowVenueScopeError(
  error: unknown,
  map: {
    notFound: (message: string) => Error;
    forbidden: (auth: AuthError) => Error;
  },
): never {
  if (error instanceof VenueScopeNotFoundError) {
    throw map.notFound(error.message);
  }
  if (error instanceof AuthError) {
    throw map.forbidden(error);
  }
  throw error;
}

export async function resolveVenueScopeForService(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
  map: {
    notFound: (message: string) => Error;
    forbidden: (auth: AuthError) => Error;
  },
): Promise<VenueScope> {
  try {
    return await requireVenueScope(ctx, organisationSlug, venueSlug);
  } catch (error) {
    rethrowVenueScopeError(error, map);
  }
}
