import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";

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
  _request: Request,
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

  try {
    const data = await peopleService.listForVenue(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
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
