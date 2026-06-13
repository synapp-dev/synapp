/**
 * Detects PostgREST errors when `venue_staff_weekly_availability` exists in code
 * but the migration has not been applied to the linked database yet.
 */
export function isVenueStaffWeeklyAvailabilityTableMissing(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = error.message ?? "";
  if (error.code === "42P01" && msg.includes("venue_staff_weekly_availability")) {
    return true;
  }
  if (!msg.includes("venue_staff_weekly_availability")) return false;
  return (
    msg.includes("schema cache") ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist") ||
    error.code === "PGRST205"
  );
}

export const VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT =
  "Run the migration `apps/supersolt/supabase/migrations/20260413100000_venue_staff_weekly_availability.sql` on your Supabase project (Dashboard → SQL Editor, or link this app and run `supabase db push`).";

export function isVenueStaffWeekInstanceAvailabilityTableMissing(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = error.message ?? "";
  if (
    error.code === "42P01" &&
    msg.includes("venue_staff_week_instance_availability")
  ) {
    return true;
  }
  if (!msg.includes("venue_staff_week_instance_availability")) return false;
  return (
    msg.includes("schema cache") ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist") ||
    error.code === "PGRST205"
  );
}

export const VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT =
  "Run the migration `apps/supersolt/supabase/migrations/20260414120000_venue_staff_week_instance_availability.sql` on your Supabase project.";
