import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import {
  isVenueStaffWeeklyAvailabilityTableMissing,
  VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT,
  isVenueStaffWeekInstanceAvailabilityTableMissing,
  VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT,
} from "@/server/workforce/venue-staff-weekly-availability-schema";

type Supabase = SupabaseClient<Database>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type VenueWeeklyAvailabilityRowDto = {
  userProfileId: string;
  dayOfWeek: number;
  isAvailable: boolean;
};

export type VenueWeekInstanceAvailabilityRowDto = {
  userProfileId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  weekStartMonday: string;
};

function assertIsoDate(label: string, value: string): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new PeopleServiceError(400, `${label} must be YYYY-MM-DD`);
  }
}

async function assertVenueAccess(
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
    throw new PeopleServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new PeopleServiceError(403, "Forbidden");
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
    throw new PeopleServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new PeopleServiceError(403, "Forbidden");
  }
}

export const availabilityService = {
  async getForVenue(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      /** When set, loads overrides for that roster week (ISO Monday). */
      weekStartMonday?: string | null;
    }
  ): Promise<{
    staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"];
    recurringAvailability: VenueWeeklyAvailabilityRowDto[];
    weekInstanceAvailability: VenueWeekInstanceAvailabilityRowDto[];
  }> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new PeopleServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const { staff } = await peopleService.listForVenue(supabase, {
      userId: args.userId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
    });

    const staffIds = staff.map((s) => s.id);

    let recurringAvailability: VenueWeeklyAvailabilityRowDto[] = [];
    if (staffIds.length > 0) {
      const { data: rows, error } = await supabase
        .from("venue_staff_weekly_availability")
        .select("user_profile_id, day_of_week, is_available")
        .eq("venue_id", context.venueId)
        .in("user_profile_id", staffIds);

      if (error) {
        if (!isVenueStaffWeeklyAvailabilityTableMissing(error)) {
          throw new PeopleServiceError(500, error.message);
        }
      } else {
        recurringAvailability = (rows ?? []).map((r) => ({
          userProfileId: r.user_profile_id,
          dayOfWeek: r.day_of_week,
          isAvailable: r.is_available,
        }));
      }
    }

    let weekInstanceAvailability: VenueWeekInstanceAvailabilityRowDto[] = [];
    const weekStart = args.weekStartMonday?.trim();
    if (staffIds.length > 0 && weekStart) {
      assertIsoDate("weekStartMonday", weekStart);
      const { data: rows, error } = await supabase
        .from("venue_staff_week_instance_availability")
        .select("user_profile_id, day_of_week, is_available, week_start_monday")
        .eq("venue_id", context.venueId)
        .eq("week_start_monday", weekStart)
        .in("user_profile_id", staffIds);

      if (error) {
        if (!isVenueStaffWeekInstanceAvailabilityTableMissing(error)) {
          throw new PeopleServiceError(500, error.message);
        }
      } else {
        weekInstanceAvailability = (rows ?? []).map((r) => ({
          userProfileId: r.user_profile_id,
          dayOfWeek: r.day_of_week,
          isAvailable: r.is_available,
          weekStartMonday: r.week_start_monday,
        }));
      }
    }

    return { staff, recurringAvailability, weekInstanceAvailability };
  },

  async setAvailabilityCell(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      userProfileId: string;
      dayOfWeek: number;
      isAvailable: boolean | null;
      /** When set, edits that calendar week only; otherwise edits recurring template. */
      weekStartMonday?: string | null;
    }
  ): Promise<void> {
    if (!Number.isInteger(args.dayOfWeek) || args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new PeopleServiceError(400, "dayOfWeek must be 0–6 (Mon–Sun)");
    }

    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new PeopleServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const weekStart = args.weekStartMonday?.trim();

    if (weekStart) {
      assertIsoDate("weekStartMonday", weekStart);

      if (args.isAvailable === null) {
        const { error } = await supabase
          .from("venue_staff_week_instance_availability")
          .delete()
          .eq("venue_id", context.venueId)
          .eq("user_profile_id", args.userProfileId)
          .eq("week_start_monday", weekStart)
          .eq("day_of_week", args.dayOfWeek);

        if (error) {
          if (isVenueStaffWeekInstanceAvailabilityTableMissing(error)) {
            throw new PeopleServiceError(503, VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT);
          }
          throw new PeopleServiceError(500, error.message);
        }
        return;
      }

      const { error } = await supabase.from("venue_staff_week_instance_availability").upsert(
        {
          organisation_id: context.organisationId,
          venue_id: context.venueId,
          user_profile_id: args.userProfileId,
          week_start_monday: weekStart,
          day_of_week: args.dayOfWeek,
          is_available: args.isAvailable,
        },
        { onConflict: "venue_id,user_profile_id,week_start_monday,day_of_week" }
      );

      if (error) {
        if (isVenueStaffWeekInstanceAvailabilityTableMissing(error)) {
          throw new PeopleServiceError(503, VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT);
        }
        throw new PeopleServiceError(400, error.message);
      }
      return;
    }

    if (args.isAvailable === null) {
      const { error } = await supabase
        .from("venue_staff_weekly_availability")
        .delete()
        .eq("venue_id", context.venueId)
        .eq("user_profile_id", args.userProfileId)
        .eq("day_of_week", args.dayOfWeek);

      if (error) {
        if (isVenueStaffWeeklyAvailabilityTableMissing(error)) {
          throw new PeopleServiceError(503, VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT);
        }
        throw new PeopleServiceError(500, error.message);
      }
      return;
    }

    const { error } = await supabase.from("venue_staff_weekly_availability").upsert(
      {
        organisation_id: context.organisationId,
        venue_id: context.venueId,
        user_profile_id: args.userProfileId,
        day_of_week: args.dayOfWeek,
        is_available: args.isAvailable,
      },
      { onConflict: "venue_id,user_profile_id,day_of_week" }
    );

    if (error) {
      if (isVenueStaffWeeklyAvailabilityTableMissing(error)) {
        throw new PeopleServiceError(503, VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT);
      }
      throw new PeopleServiceError(400, error.message);
    }
  },

  async copyWeekInstanceToWeek(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      fromWeekStartMonday: string;
      toWeekStartMonday: string;
    }
  ): Promise<void> {
    assertIsoDate("fromWeekStartMonday", args.fromWeekStartMonday);
    assertIsoDate("toWeekStartMonday", args.toWeekStartMonday);

    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new PeopleServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const { data: source, error: readErr } = await supabase
      .from("venue_staff_week_instance_availability")
      .select("user_profile_id, day_of_week, is_available")
      .eq("venue_id", context.venueId)
      .eq("week_start_monday", args.fromWeekStartMonday);

    if (readErr) {
      if (isVenueStaffWeekInstanceAvailabilityTableMissing(readErr)) {
        throw new PeopleServiceError(503, VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT);
      }
      throw new PeopleServiceError(500, readErr.message);
    }

    const rows = (source ?? []).map((r) => ({
      organisation_id: context.organisationId,
      venue_id: context.venueId,
      user_profile_id: r.user_profile_id,
      week_start_monday: args.toWeekStartMonday,
      day_of_week: r.day_of_week,
      is_available: r.is_available,
    }));

    if (rows.length === 0) {
      throw new PeopleServiceError(400, "No availability saved for the source week to copy");
    }

    const { error: upErr } = await supabase.from("venue_staff_week_instance_availability").upsert(rows, {
      onConflict: "venue_id,user_profile_id,week_start_monday,day_of_week",
    });

    if (upErr) {
      if (isVenueStaffWeekInstanceAvailabilityTableMissing(upErr)) {
        throw new PeopleServiceError(503, VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT);
      }
      throw new PeopleServiceError(400, upErr.message);
    }
  },
};
