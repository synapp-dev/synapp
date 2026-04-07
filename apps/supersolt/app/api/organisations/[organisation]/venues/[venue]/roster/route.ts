import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { PeopleServiceError } from "@/server/workforce/people.service";
import { rosterService } from "@/server/workforce/roster.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

async function getUserId() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart")?.trim();
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Query param weekStart=YYYY-MM-DD is required", status: 400 },
      },
      { status: 400 }
    );
  }

  const lifecycleRaw = url.searchParams.get("lifecycle")?.trim().toLowerCase();
  const lifecycle =
    lifecycleRaw === "draft" || lifecycleRaw === "all"
      ? lifecycleRaw
      : lifecycleRaw === "published" || lifecycleRaw === undefined || lifecycleRaw === ""
        ? "published"
        : null;
  if (!lifecycle) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Query param lifecycle must be published, draft, or all", status: 400 },
      },
      { status: 400 }
    );
  }

  try {
    const data = await rosterService.getWeek(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      weekStart,
      lifecycle,
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof PeopleServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

type CreateShiftBody = {
  userProfileId?: string;
  shiftDate?: string;
  start?: string;
  end?: string;
  positionId?: string;
  breakMinutes?: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  let body: CreateShiftBody;
  try {
    body = (await request.json()) as CreateShiftBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const userProfileId = body.userProfileId?.trim();
  const shiftDate = body.shiftDate?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();
  const positionId = body.positionId?.trim();
  const breakMinutes = body.breakMinutes;

  if (!userProfileId || !shiftDate || !start || !end || !positionId) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "userProfileId, shiftDate, start, end, and positionId are required",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  if (typeof breakMinutes !== "number" || !Number.isFinite(breakMinutes)) {
    return NextResponse.json(
      { data: null, error: { message: "breakMinutes must be a number", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const data = await rosterService.createShift(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      userProfileId,
      shiftDate,
      start,
      end,
      positionId,
      breakMinutes: Math.round(breakMinutes),
    });
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof PeopleServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

type PatchShiftBody = {
  shiftId?: string;
  userProfileId?: string;
  shiftDate?: string;
  start?: string;
  end?: string;
  positionId?: string;
  breakMinutes?: number;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  let body: PatchShiftBody;
  try {
    body = (await request.json()) as PatchShiftBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const shiftId = body.shiftId?.trim();
  const userProfileId = body.userProfileId?.trim();
  const shiftDate = body.shiftDate?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();
  const positionId = body.positionId?.trim();
  const breakMinutes = body.breakMinutes;

  if (!shiftId || !userProfileId || !shiftDate || !start || !end || !positionId) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            "shiftId, userProfileId, shiftDate, start, end, and positionId are required",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  if (typeof breakMinutes !== "number" || !Number.isFinite(breakMinutes)) {
    return NextResponse.json(
      { data: null, error: { message: "breakMinutes must be a number", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const data = await rosterService.updateShift(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      shiftId,
      userProfileId,
      shiftDate,
      start,
      end,
      positionId,
      breakMinutes: Math.round(breakMinutes),
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof PeopleServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}
