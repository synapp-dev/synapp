import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import {
  isVenueStaffWeeklyAvailabilityTableMissing,
  VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT,
  isVenueStaffWeekInstanceAvailabilityTableMissing,
  VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT,
} from "@/server/workforce/venue-staff-weekly-availability-schema";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export type VenueWeeklyAvailabilityRowDto = {
  userProfileId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  /** When `is_available` is true: both null = all day. */
  availableStartTime: string | null;
  availableEndTime: string | null;
};

export type VenueWeekInstanceAvailabilityRowDto = {
  userProfileId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  weekStartMonday: string;
  availableStartTime: string | null;
  availableEndTime: string | null;
};

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new PeopleServiceError(error.status, error.message);
  }
  throw error;
}

function dbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown database error";
}

function dbErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code);
  }
  return undefined;
}

function timeToMinutes(hhmmOrHhmmss: string): number {
  const parts = hhmmOrHhmmss.split(":").map((x) => Number(x.trim()));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/** Accepts HH:mm from API; returns HH:mm:ss for Postgres `time`. */
function normalizeAvailabilityTimeForDb(input: string): string {
  const t = input.trim();
  if (!TIME_HHMM_RE.test(t)) {
    throw new PeopleServiceError(400, "Time must be HH:mm (24h)");
  }
  return `${t}:00`;
}

function mapDbTimeToDto(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function assertIsoDate(label: string, value: string): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new PeopleServiceError(400, `${label} must be YYYY-MM-DD`);
  }
}

function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new PeopleServiceError(404, message),
    forbidden: (auth) => new PeopleServiceError(auth.status, auth.message),
  });
}

export const availabilityService = {
  async getForVenue(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      /** When set, loads overrides for that roster week (ISO Monday). */
      weekStartMonday?: string | null;
    },
  ): Promise<{
    staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"];
    recurringAvailability: VenueWeeklyAvailabilityRowDto[];
    weekInstanceAvailability: VenueWeekInstanceAvailabilityRowDto[];
  }> {
    const context = await resolveVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const { staff } = await peopleService.listForVenue(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
    });

    const staffIds = staff.map((s) => s.id);

    let recurringAvailability: VenueWeeklyAvailabilityRowDto[] = [];
    if (staffIds.length > 0) {
      try {
        const rows = await ctx.appDb.rls((tx) =>
          workforceRepo.listWeeklyAvailability(tx, context.venueId, staffIds),
        );
        recurringAvailability = rows.map((r) => ({
          userProfileId: r.userProfileId,
          dayOfWeek: r.dayOfWeek,
          isAvailable: r.isAvailable,
          availableStartTime: mapDbTimeToDto(r.availableStartTime),
          availableEndTime: mapDbTimeToDto(r.availableEndTime),
        }));
      } catch (error) {
        if (
          !isVenueStaffWeeklyAvailabilityTableMissing({
            message: dbErrorMessage(error),
            code: dbErrorCode(error),
          })
        ) {
          throw new PeopleServiceError(500, dbErrorMessage(error));
        }
      }
    }

    let weekInstanceAvailability: VenueWeekInstanceAvailabilityRowDto[] = [];
    const weekStart = args.weekStartMonday?.trim();
    if (staffIds.length > 0 && weekStart) {
      assertIsoDate("weekStartMonday", weekStart);
      try {
        const rows = await ctx.appDb.rls((tx) =>
          workforceRepo.listWeekInstanceAvailability(tx, {
            venueId: context.venueId,
            weekStartMonday: weekStart,
            staffIds,
          }),
        );
        weekInstanceAvailability = rows.map((r) => ({
          userProfileId: r.userProfileId,
          dayOfWeek: r.dayOfWeek,
          isAvailable: r.isAvailable,
          weekStartMonday: r.weekStartMonday,
          availableStartTime: mapDbTimeToDto(r.availableStartTime),
          availableEndTime: mapDbTimeToDto(r.availableEndTime),
        }));
      } catch (error) {
        if (
          !isVenueStaffWeekInstanceAvailabilityTableMissing({
            message: dbErrorMessage(error),
            code: dbErrorCode(error),
          })
        ) {
          throw new PeopleServiceError(500, dbErrorMessage(error));
        }
      }
    }

    return { staff, recurringAvailability, weekInstanceAvailability };
  },

  async setAvailabilityCell(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      userProfileId: string;
      dayOfWeek: number;
      isAvailable: boolean | null;
      /** When set, edits that calendar week only; otherwise edits recurring template. */
      weekStartMonday?: string | null;
      /** When `isAvailable` is true: both null = all day. Ignored when not available. */
      availableStartTime?: string | null;
      availableEndTime?: string | null;
    },
  ): Promise<void> {
    if (!Number.isInteger(args.dayOfWeek) || args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new PeopleServiceError(400, "dayOfWeek must be 0–6 (Mon–Sun)");
    }

    const context = await resolveVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const weekStart = args.weekStartMonday?.trim();

    let startDb: string | null = null;
    let endDb: string | null = null;
    if (args.isAvailable === true) {
      const s = args.availableStartTime;
      const e = args.availableEndTime;
      const hasS = s != null && String(s).trim() !== "";
      const hasE = e != null && String(e).trim() !== "";
      if (hasS !== hasE) {
        throw new PeopleServiceError(
          400,
          "When setting hours, both availableStartTime and availableEndTime are required (or omit both for all day)",
        );
      }
      if (hasS && hasE) {
        startDb = normalizeAvailabilityTimeForDb(String(s));
        endDb = normalizeAvailabilityTimeForDb(String(e));
        if (timeToMinutes(startDb) >= timeToMinutes(endDb)) {
          throw new PeopleServiceError(400, "availableEndTime must be after availableStartTime");
        }
      }
    }

    if (weekStart) {
      assertIsoDate("weekStartMonday", weekStart);

      try {
        if (args.isAvailable === null) {
          await ctx.appDb.rls((tx) =>
            workforceRepo.deleteWeekInstanceAvailabilityCell(tx, {
              venueId: context.venueId,
              userProfileId: args.userProfileId,
              weekStartMonday: weekStart,
              dayOfWeek: args.dayOfWeek,
            }),
          );
          return;
        }

        const isAvailable = args.isAvailable;

        await ctx.appDb.rls((tx) =>
          workforceRepo.upsertWeekInstanceAvailabilityCell(tx, {
            organisationId: context.organisationId,
            venueId: context.venueId,
            userProfileId: args.userProfileId,
            weekStartMonday: weekStart,
            dayOfWeek: args.dayOfWeek,
            isAvailable,
            availableStartTime: isAvailable ? startDb : null,
            availableEndTime: isAvailable ? endDb : null,
          }),
        );
      } catch (error) {
        if (
          isVenueStaffWeekInstanceAvailabilityTableMissing({
            message: dbErrorMessage(error),
            code: dbErrorCode(error),
          })
        ) {
          throw new PeopleServiceError(
            503,
            VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT,
          );
        }
        throw new PeopleServiceError(400, dbErrorMessage(error));
      }
      return;
    }

    try {
      if (args.isAvailable === null) {
        await ctx.appDb.rls((tx) =>
          workforceRepo.deleteWeeklyAvailabilityCell(tx, {
            venueId: context.venueId,
            userProfileId: args.userProfileId,
            dayOfWeek: args.dayOfWeek,
          }),
        );
        return;
      }

      const isAvailable = args.isAvailable;

      await ctx.appDb.rls((tx) =>
        workforceRepo.upsertWeeklyAvailabilityCell(tx, {
          organisationId: context.organisationId,
          venueId: context.venueId,
          userProfileId: args.userProfileId,
          dayOfWeek: args.dayOfWeek,
          isAvailable,
          availableStartTime: isAvailable ? startDb : null,
          availableEndTime: isAvailable ? endDb : null,
        }),
      );
    } catch (error) {
      if (
        isVenueStaffWeeklyAvailabilityTableMissing({
          message: dbErrorMessage(error),
          code: dbErrorCode(error),
        })
      ) {
        throw new PeopleServiceError(
          503,
          VENUE_STAFF_WEEKLY_AVAILABILITY_SETUP_HINT,
        );
      }
      throw new PeopleServiceError(400, dbErrorMessage(error));
    }
  },

  async copyWeekInstanceToWeek(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      fromWeekStartMonday: string;
      toWeekStartMonday: string;
    },
  ): Promise<void> {
    assertIsoDate("fromWeekStartMonday", args.fromWeekStartMonday);
    assertIsoDate("toWeekStartMonday", args.toWeekStartMonday);

    const context = await resolveVenueScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    try {
      const source = await ctx.appDb.rls((tx) =>
        workforceRepo.listWeekInstanceAvailabilityForWeek(tx, {
          venueId: context.venueId,
          weekStartMonday: args.fromWeekStartMonday,
        }),
      );

      const rows = source.map((r) => ({
        organisationId: context.organisationId,
        venueId: context.venueId,
        userProfileId: r.userProfileId,
        weekStartMonday: args.toWeekStartMonday,
        dayOfWeek: r.dayOfWeek,
        isAvailable: r.isAvailable,
        availableStartTime: r.availableStartTime,
        availableEndTime: r.availableEndTime,
      }));

      if (rows.length === 0) {
        throw new PeopleServiceError(
          400,
          "No availability saved for the source week to copy",
        );
      }

      await ctx.appDb.rls((tx) =>
        workforceRepo.bulkUpsertWeekInstanceAvailability(tx, rows),
      );
    } catch (error) {
      if (error instanceof PeopleServiceError) throw error;
      if (
        isVenueStaffWeekInstanceAvailabilityTableMissing({
          message: dbErrorMessage(error),
          code: dbErrorCode(error),
        })
      ) {
        throw new PeopleServiceError(
          503,
          VENUE_STAFF_WEEK_INSTANCE_AVAILABILITY_SETUP_HINT,
        );
      }
      throw new PeopleServiceError(400, dbErrorMessage(error));
    }
  },
};
