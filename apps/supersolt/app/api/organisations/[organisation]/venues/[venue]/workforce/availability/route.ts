import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { availabilityService } from "@/server/workforce/availability.service";
import { PeopleServiceError } from "@/server/workforce/people.service";

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

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const weekStartMonday = url.searchParams.get("weekStartMonday")?.trim() || null;

  try {
    const data = await availabilityService.getForVenue(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      weekStartMonday: weekStartMonday || undefined,
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

type PatchBody = {
  userProfileId?: string;
  dayOfWeek?: number;
  isAvailable?: boolean | null;
  /** When set, edits that roster week only (ISO Monday). Omit to edit recurring default. */
  weekStartMonday?: string | null;
};

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const userProfileId = body.userProfileId?.trim();
  const dayOfWeek = body.dayOfWeek;
  const rawAvailable = body.isAvailable;
  const weekStartMonday = body.weekStartMonday?.trim() || undefined;

  if (!userProfileId || typeof dayOfWeek !== "number") {
    return NextResponse.json(
      {
        data: null,
        error: { message: "userProfileId and dayOfWeek are required", status: 400 },
      },
      { status: 400 }
    );
  }

  if (!("isAvailable" in body)) {
    return NextResponse.json(
      { data: null, error: { message: "isAvailable is required (boolean or null to clear)", status: 400 } },
      { status: 400 }
    );
  }

  if (rawAvailable !== null && typeof rawAvailable !== "boolean") {
    return NextResponse.json(
      { data: null, error: { message: "isAvailable must be boolean or null", status: 400 } },
      { status: 400 }
    );
  }

  const nextAvailable: boolean | null = rawAvailable;

  try {
    await availabilityService.setAvailabilityCell(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      userProfileId,
      dayOfWeek,
      isAvailable: nextAvailable,
      weekStartMonday,
    });
    return NextResponse.json({ data: { ok: true }, error: null });
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

type PostBody = {
  action?: string;
  fromWeekStartMonday?: string;
  toWeekStartMonday?: string;
};

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  if (body.action !== "copy_week") {
    return NextResponse.json(
      { data: null, error: { message: "Unsupported action", status: 400 } },
      { status: 400 }
    );
  }

  const fromWeekStartMonday = body.fromWeekStartMonday?.trim();
  const toWeekStartMonday = body.toWeekStartMonday?.trim();
  if (!fromWeekStartMonday || !toWeekStartMonday) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "fromWeekStartMonday and toWeekStartMonday are required", status: 400 },
      },
      { status: 400 }
    );
  }

  try {
    await availabilityService.copyWeekInstanceToWeek(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      fromWeekStartMonday,
      toWeekStartMonday,
    });
    return NextResponse.json({ data: { ok: true }, error: null });
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
