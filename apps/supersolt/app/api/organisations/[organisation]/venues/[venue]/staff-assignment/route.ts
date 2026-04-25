import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  venueStaffAssignmentService,
  VenueStaffAssignmentError,
} from "@/server/venues/venue-staff-assignment.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

async function getSessionUserId() {
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
  const { supabase, userId } = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  try {
    const data = await venueStaffAssignmentService.listOrgMembersForVenue(supabase, {
      organisationSlug: organisation,
      venueSlug: venue,
      actorUserId: userId,
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof VenueStaffAssignmentError) {
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
  userOrganisationIds?: string[];
  venueRoleSlug?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getSessionUserId();
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
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  const userOrganisationIds = Array.isArray(body.userOrganisationIds)
    ? body.userOrganisationIds
    : [];

  try {
    const data = await venueStaffAssignmentService.assignVenueAccess(supabase, {
      organisationSlug: organisation,
      venueSlug: venue,
      actorUserId: userId,
      userOrganisationIds,
      venueRoleSlug:
        body.venueRoleSlug === undefined
          ? null
          : typeof body.venueRoleSlug === "string"
            ? body.venueRoleSlug
            : null,
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof VenueStaffAssignmentError) {
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
