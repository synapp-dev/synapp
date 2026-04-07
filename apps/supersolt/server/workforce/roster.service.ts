import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import {
  formatShiftClockInVenue,
  formatShiftDateInVenue,
  shiftBoundsUtc,
  venueCalendarDayBoundsUtc,
  venueWeekRangeUtc,
} from "@/lib/roster/venue-time";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import {
  isVenueStaffWeeklyAvailabilityTableMissing,
  isVenueStaffWeekInstanceAvailabilityTableMissing,
} from "@/server/workforce/venue-staff-weekly-availability-schema";

type Supabase = SupabaseClient<Database>;

export type RosterPositionDto = {
  id: string;
  slug: string;
  displayName: string;
  sortOrder: number;
};

export type RosterShiftDto = {
  id: string;
  staffId: string;
  dayIndex: number;
  shiftDate: string;
  start: string;
  end: string;
  positionId: string;
  positionSlug: string;
  positionDisplayName: string;
  breakMins: number;
  lifecycle: Database["public"]["Enums"]["roster_shift_lifecycle"];
};

export type RosterAvailabilityHintDto = {
  staffId: string;
  dayIndex: number;
  available: boolean;
};

export type RosterWeekPayload = {
  weekStart: string;
  weekEnd: string;
  positions: RosterPositionDto[];
  staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"];
  shifts: RosterShiftDto[];
  /** Advisory only: merged week + recurring; `true` / `false` when set, omitted when no row. */
  availability: RosterAvailabilityHintDto[];
};

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function normalizeShiftHms(t: string): string {
  const s = t.trim();
  const parts = s.split(":").map((x) => x.trim());
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "00";
  const sec = parts[2] ?? "00";
  if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m)) {
    throw new PeopleServiceError(400, "start and end must be HH:mm or HH:mm:ss");
  }
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${sec.padStart(2, "0")}`;
}

function dayIndexInWeek(weekStart: string, shiftDate: string): number {
  const p1 = weekStart.split("-").map(Number);
  const p2 = shiftDate.split("-").map(Number);
  const y1 = p1[0] ?? 0;
  const m1 = p1[1] ?? 1;
  const d1 = p1[2] ?? 1;
  const y2 = p2[0] ?? 0;
  const m2 = p2[1] ?? 1;
  const d2 = p2[2] ?? 1;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
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

export const rosterService = {
  async getWeek(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      /** ISO date `YYYY-MM-DD` (Monday of the visible week). */
      weekStart: string;
      /** Shifts to return: published (default), draft only, or both. */
      lifecycle?: "published" | "draft" | "all";
    }
  ): Promise<RosterWeekPayload> {
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

    const weekEnd = addDaysIso(args.weekStart, 6);
    const tz = context.timezone;
    const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(args.weekStart, tz);
    const lifecycle = args.lifecycle ?? "published";

    const { data: positionRows, error: posError } = await supabase
      .from("positions")
      .select("id, slug, display_name, sort_order")
      .eq("venue_id", context.venueId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true });

    if (posError) {
      throw new PeopleServiceError(500, posError.message);
    }

    const positions: RosterPositionDto[] = (positionRows ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      displayName: p.display_name,
      sortOrder: p.sort_order,
    }));

    const positionMeta = new Map(positions.map((p) => [p.id, p]));

    const { staff } = await peopleService.listForVenue(supabase, {
      userId: args.userId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
    });

    let shiftQuery = supabase
      .from("roster_shifts")
      .select("id, user_profile_id, starts_at, ends_at, break_minutes, position_id, lifecycle")
      .eq("venue_id", context.venueId)
      .lt("starts_at", endExclusiveUtc.toISOString())
      .gt("ends_at", startUtc.toISOString());

    if (lifecycle === "published") {
      shiftQuery = shiftQuery.eq("lifecycle", "published");
    } else if (lifecycle === "draft") {
      shiftQuery = shiftQuery.eq("lifecycle", "draft");
    }

    const { data: shiftRows, error: shiftError } = await shiftQuery;

    if (shiftError) {
      throw new PeopleServiceError(500, shiftError.message);
    }

    const shifts: RosterShiftDto[] = (shiftRows ?? []).map((row) => {
      const pos = positionMeta.get(row.position_id);
      const slug = pos?.slug ?? "unknown";
      const displayName = pos?.displayName ?? slug;
      const shiftDate = formatShiftDateInVenue(row.starts_at, tz);
      return {
        id: row.id,
        staffId: row.user_profile_id,
        dayIndex: dayIndexInWeek(args.weekStart, shiftDate),
        shiftDate,
        start: formatShiftClockInVenue(row.starts_at, tz),
        end: formatShiftClockInVenue(row.ends_at, tz),
        positionId: row.position_id,
        positionSlug: slug,
        positionDisplayName: displayName,
        breakMins: row.break_minutes,
        lifecycle: row.lifecycle,
      };
    });

    const staffIds = staff.map((s) => s.id);
    let availability: RosterAvailabilityHintDto[] = [];
    if (staffIds.length > 0) {
      const weekByStaff = new Map<string, Map<number, boolean>>();
      const { data: instRows, error: instErr } = await supabase
        .from("venue_staff_week_instance_availability")
        .select("user_profile_id, day_of_week, is_available")
        .eq("venue_id", context.venueId)
        .eq("week_start_monday", args.weekStart)
        .in("user_profile_id", staffIds);

      if (instErr) {
        if (!isVenueStaffWeekInstanceAvailabilityTableMissing(instErr)) {
          throw new PeopleServiceError(500, instErr.message);
        }
      } else {
        for (const r of instRows ?? []) {
          if (!weekByStaff.has(r.user_profile_id)) weekByStaff.set(r.user_profile_id, new Map());
          weekByStaff.get(r.user_profile_id)!.set(r.day_of_week, r.is_available);
        }
      }

      const recByStaff = new Map<string, Map<number, boolean>>();
      const { data: recRows, error: recErr } = await supabase
        .from("venue_staff_weekly_availability")
        .select("user_profile_id, day_of_week, is_available")
        .eq("venue_id", context.venueId)
        .in("user_profile_id", staffIds);

      if (recErr) {
        if (!isVenueStaffWeeklyAvailabilityTableMissing(recErr)) {
          throw new PeopleServiceError(500, recErr.message);
        }
      } else {
        for (const r of recRows ?? []) {
          if (!recByStaff.has(r.user_profile_id)) recByStaff.set(r.user_profile_id, new Map());
          recByStaff.get(r.user_profile_id)!.set(r.day_of_week, r.is_available);
        }
      }

      for (const sid of staffIds) {
        for (let d = 0; d < 7; d += 1) {
          const w = weekByStaff.get(sid)?.get(d);
          const t = recByStaff.get(sid)?.get(d);
          const effective = w !== undefined ? w : t;
          if (effective === true) {
            availability.push({ staffId: sid, dayIndex: d, available: true });
          } else if (effective === false) {
            availability.push({ staffId: sid, dayIndex: d, available: false });
          }
        }
      }
    }

    return {
      weekStart: args.weekStart,
      weekEnd,
      positions,
      staff,
      shifts,
      availability,
    };
  },

  async createShift(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      userProfileId: string;
      shiftDate: string;
      start: string;
      end: string;
      positionId: string;
      breakMinutes: number;
    }
  ): Promise<{ id: string }> {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(args.shiftDate)) {
      throw new PeopleServiceError(400, "shiftDate must be YYYY-MM-DD");
    }

    if (!Number.isFinite(args.breakMinutes) || args.breakMinutes < 0 || args.breakMinutes > 24 * 60) {
      throw new PeopleServiceError(400, "breakMinutes must be between 0 and 1440");
    }

    let startHms: string;
    let endHms: string;
    try {
      startHms = normalizeShiftHms(args.start);
      endHms = normalizeShiftHms(args.end);
    } catch (e) {
      if (e instanceof PeopleServiceError) throw e;
      throw new PeopleServiceError(400, "Invalid start or end time");
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

    const tz = context.timezone;
    const { dayStartUtc, dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(args.shiftDate, tz);

    const { data: overlapRows, error: overlapError } = await supabase
      .from("roster_shifts")
      .select("id")
      .eq("venue_id", context.venueId)
      .eq("user_profile_id", args.userProfileId)
      .lt("starts_at", dayEndExclusiveUtc.toISOString())
      .gt("ends_at", dayStartUtc.toISOString())
      .limit(1);

    if (overlapError) {
      throw new PeopleServiceError(500, overlapError.message);
    }

    if (overlapRows && overlapRows.length > 0) {
      throw new PeopleServiceError(409, "This staff member already has a shift on that day");
    }

    const { startsAt, endsAt } = shiftBoundsUtc(args.shiftDate, startHms, endHms, tz);

    const { data: inserted, error: insertError } = await supabase
      .from("roster_shifts")
      .insert({
        organisation_id: context.organisationId,
        venue_id: context.venueId,
        user_profile_id: args.userProfileId,
        position_id: args.positionId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        break_minutes: args.breakMinutes,
        lifecycle: "draft",
        source: "manual",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new PeopleServiceError(400, insertError.message);
    }

    if (!inserted?.id) {
      throw new PeopleServiceError(500, "Insert failed");
    }

    return { id: inserted.id };
  },

  async updateShift(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      shiftId: string;
      userProfileId: string;
      shiftDate: string;
      start: string;
      end: string;
      positionId: string;
      breakMinutes: number;
    }
  ): Promise<{ id: string }> {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(args.shiftDate)) {
      throw new PeopleServiceError(400, "shiftDate must be YYYY-MM-DD");
    }

    if (!Number.isFinite(args.breakMinutes) || args.breakMinutes < 0 || args.breakMinutes > 24 * 60) {
      throw new PeopleServiceError(400, "breakMinutes must be between 0 and 1440");
    }

    let startHms: string;
    let endHms: string;
    try {
      startHms = normalizeShiftHms(args.start);
      endHms = normalizeShiftHms(args.end);
    } catch (e) {
      if (e instanceof PeopleServiceError) throw e;
      throw new PeopleServiceError(400, "Invalid start or end time");
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

    const { data: existing, error: existingError } = await supabase
      .from("roster_shifts")
      .select("id")
      .eq("id", args.shiftId)
      .eq("venue_id", context.venueId)
      .maybeSingle();

    if (existingError) {
      throw new PeopleServiceError(500, existingError.message);
    }
    if (!existing) {
      throw new PeopleServiceError(404, "Shift not found");
    }

    const tz = context.timezone;
    const { dayStartUtc, dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(args.shiftDate, tz);

    const { data: overlapRows, error: overlapError } = await supabase
      .from("roster_shifts")
      .select("id")
      .eq("venue_id", context.venueId)
      .eq("user_profile_id", args.userProfileId)
      .neq("id", args.shiftId)
      .lt("starts_at", dayEndExclusiveUtc.toISOString())
      .gt("ends_at", dayStartUtc.toISOString())
      .limit(1);

    if (overlapError) {
      throw new PeopleServiceError(500, overlapError.message);
    }

    if (overlapRows && overlapRows.length > 0) {
      throw new PeopleServiceError(409, "This staff member already has a shift on that day");
    }

    const { startsAt, endsAt } = shiftBoundsUtc(args.shiftDate, startHms, endHms, tz);

    const { data: updated, error: updateError } = await supabase
      .from("roster_shifts")
      .update({
        user_profile_id: args.userProfileId,
        position_id: args.positionId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        break_minutes: args.breakMinutes,
      })
      .eq("id", args.shiftId)
      .eq("venue_id", context.venueId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new PeopleServiceError(400, updateError.message);
    }
    if (!updated?.id) {
      throw new PeopleServiceError(404, "Shift not found");
    }

    return { id: updated.id };
  },
};
