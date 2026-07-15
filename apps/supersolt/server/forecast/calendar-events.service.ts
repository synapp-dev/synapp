import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  forecastRepo,
  type VenueCalendarEventRow,
} from "@/server/forecast/forecast.repo";
import type { ForecastEventKind } from "@/server/forecast/forecast-events";
import { recomputeForecastsForVenue } from "@/server/forecast/forecast.service";

export class CalendarEventError extends AuthError {}

const EVENT_KINDS: ForecastEventKind[] = [
  "closure",
  "promotion",
  "event",
  "price_change",
  "menu_change",
];

export type CalendarEventDto = {
  id: string;
  kind: ForecastEventKind;
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
  expectedMultiplier: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventInput = {
  kind: string;
  startDate: string;
  endDate: string;
  title: string;
  note?: string | null;
  expectedMultiplier?: number | null;
};

function toDto(row: VenueCalendarEventRow): CalendarEventDto {
  return {
    id: row.id,
    kind: row.kind as ForecastEventKind,
    startDate: row.startDate,
    endDate: row.endDate,
    title: row.title,
    note: row.note,
    expectedMultiplier:
      row.expectedMultiplier === null ? null : Number(row.expectedMultiplier),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate and normalise operator input; throws CalendarEventError(400) on anything invalid. */
function normaliseInput(input: CalendarEventInput): {
  kind: ForecastEventKind;
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
  expectedMultiplier: string | null;
} {
  if (!EVENT_KINDS.includes(input.kind as ForecastEventKind)) {
    throw new CalendarEventError(400, `Invalid event kind: ${input.kind}`);
  }
  const kind = input.kind as ForecastEventKind;
  if (!ISO_DATE.test(input.startDate) || !ISO_DATE.test(input.endDate)) {
    throw new CalendarEventError(400, "Dates must be YYYY-MM-DD");
  }
  if (input.endDate < input.startDate) {
    throw new CalendarEventError(400, "End date must be on or after start date");
  }
  const title = input.title?.trim();
  if (!title) {
    throw new CalendarEventError(400, "Title is required");
  }
  // Multiplier only applies to promotions / one-off events; ignored elsewhere.
  let multiplier: string | null = null;
  if (
    (kind === "promotion" || kind === "event") &&
    input.expectedMultiplier != null
  ) {
    const m = Number(input.expectedMultiplier);
    if (!Number.isFinite(m) || m <= 0 || m > 5) {
      throw new CalendarEventError(
        400,
        "Expected multiplier must be between 0 and 5",
      );
    }
    multiplier = m.toFixed(3);
  }
  return {
    kind,
    startDate: input.startDate,
    endDate: input.endDate,
    title,
    note: input.note?.trim() || null,
    expectedMultiplier: multiplier,
  };
}

async function resolveVenue(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new CalendarEventError(404, message),
    forbidden: (auth) => auth,
  });
}

/** Recompute forecasts so the change is reflected immediately (reads sales; no Square/Xero calls). */
async function recompute(
  ctx: RequestAuthContext,
  scope: { venueId: string; timezone: string },
): Promise<void> {
  try {
    const state = await forecastRepo.getVenueForecastStateAdmin(
      ctx.appDb,
      scope.venueId,
    );
    await recomputeForecastsForVenue(ctx.appDb, {
      venueId: scope.venueId,
      timezone: scope.timezone,
      dataStartsFrom: state?.dataStartsFrom ?? null,
    });
  } catch (error) {
    // Non-fatal: the read path recomputes live, and the next sync will persist forward rows.
    console.error("[calendar-events] recompute after mutation failed", error);
  }
}

export async function listCalendarEvents(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string },
): Promise<CalendarEventDto[]> {
  const scope = await resolveVenue(ctx, args.organisationSlug, args.venueSlug);
  const rows = await ctx.appDb.rls((tx) =>
    forecastRepo.listCalendarEvents(tx, scope.venueId),
  );
  return rows.map(toDto);
}

export async function createCalendarEvent(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    input: CalendarEventInput;
  },
): Promise<CalendarEventDto> {
  const scope = await resolveVenue(ctx, args.organisationSlug, args.venueSlug);
  const data = normaliseInput(args.input);
  const row = await ctx.appDb.rls((tx) =>
    forecastRepo.insertCalendarEvent(tx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      createdBy: ctx.userId,
      ...data,
    }),
  );
  await recompute(ctx, scope);
  return toDto(row);
}

export async function updateCalendarEvent(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    id: string;
    input: CalendarEventInput;
  },
): Promise<CalendarEventDto> {
  const scope = await resolveVenue(ctx, args.organisationSlug, args.venueSlug);
  const data = normaliseInput(args.input);
  const row = await ctx.appDb.rls((tx) =>
    forecastRepo.updateCalendarEvent(tx, {
      id: args.id,
      venueId: scope.venueId,
      patch: data,
    }),
  );
  if (!row) {
    throw new CalendarEventError(404, "Event not found");
  }
  await recompute(ctx, scope);
  return toDto(row);
}

export async function deleteCalendarEvent(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string; id: string },
): Promise<void> {
  const scope = await resolveVenue(ctx, args.organisationSlug, args.venueSlug);
  const ok = await ctx.appDb.rls((tx) =>
    forecastRepo.deleteCalendarEvent(tx, { id: args.id, venueId: scope.venueId }),
  );
  if (!ok) {
    throw new CalendarEventError(404, "Event not found");
  }
  await recompute(ctx, scope);
}
