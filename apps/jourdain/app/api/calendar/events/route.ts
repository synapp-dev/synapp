import { NextRequest, NextResponse } from "next/server";
import { addDays, addHours, format, parseISO } from "date-fns";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { getCalendarContext } from "@/lib/google/client";
import { mapEvent } from "@/lib/google/events";
import type { calendar_v3 } from "googleapis";

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeZone: z.string().max(100).optional(),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

function notConnected() {
  return NextResponse.json(
    { data: null, error: { message: "Google Calendar is not connected" } },
    { status: 409 }
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const context = await getCalendarContext(user.id);
  if (!context) return notConnected();

  const params = request.nextUrl.searchParams;
  const start = params.get("start");
  const end = params.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { data: null, error: { message: "start and end are required" } },
      { status: 400 }
    );
  }

  try {
    const { data } = await context.calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    const events = (data.items ?? [])
      .filter((event) => event.status !== "cancelled")
      .map(mapEvent);
    return NextResponse.json({ data: events, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to load events",
        },
      },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const context = await getCalendarContext(user.id);
  if (!context) return notConnected();

  const parsed = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  const input = parsed.data;
  let requestBody: calendar_v3.Schema$Event;
  if (input.allDay) {
    requestBody = {
      summary: input.title,
      start: { date: input.date },
      end: { date: format(addDays(parseISO(input.date), 1), "yyyy-MM-dd") },
    };
  } else {
    if (!input.startTime) {
      return NextResponse.json(
        { data: null, error: { message: "startTime is required for timed events" } },
        { status: 400 }
      );
    }
    const startDateTime = `${input.date}T${input.startTime}:00`;
    const endDateTime = input.endTime
      ? `${input.date}T${input.endTime}:00`
      : format(addHours(parseISO(startDateTime), 1), "yyyy-MM-dd'T'HH:mm:ss");
    const timeZone =
      input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    requestBody = {
      summary: input.title,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    };
  }

  try {
    const { data } = await context.calendar.events.insert({
      calendarId: "primary",
      requestBody,
    });
    return NextResponse.json({ data: mapEvent(data), error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to create event",
        },
      },
      { status: 502 }
    );
  }
}
