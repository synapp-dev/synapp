import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export class VenueAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Active membership in the org plus an active user_venues row for this venue. */
export async function assertUserHasVenueAccess(
  supabase: Supabase,
  args: { userId: string; organisationId: string; venueId: string }
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", args.userId)
    .eq("organisation_id", args.organisationId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new VenueAccessError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new VenueAccessError(403, "Forbidden");
  }

  const { data: venueAccess, error: venueError } = await supabase
    .from("user_venues")
    .select("id")
    .in("user_organisation_id", membershipIds)
    .eq("venue_id", args.venueId)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1);

  if (venueError) {
    throw new VenueAccessError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new VenueAccessError(403, "Forbidden");
  }
}
