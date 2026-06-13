import type { AppDb } from "@/server/db/create-app-db";
import { assertVenueMemberDb, type UserTenantRoles } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";

/** @deprecated Use AuthError */
export class VenueAccessError extends AuthError {}

/** Active membership in the org plus an active user_venues row for this venue. */
export async function assertUserHasVenueAccess(
  appDb: AppDb,
  args: { userId: string; organisationId: string; venueId: string },
): Promise<UserTenantRoles> {
  return assertVenueMemberDb(appDb, args.userId, {
    organisationId: args.organisationId,
    venueId: args.venueId,
  });
}
