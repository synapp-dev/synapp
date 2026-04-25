import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  createOrganisationVenueForOwner,
  CreateOrganisationVenueError,
} from "@/server/venues/create-organisation-venue.service";

type RouteParams = {
  organisation: string;
};

type Body = {
  name?: string;
  addressLine1?: string | null;
  timezone?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation } = await context.params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const venue = await createOrganisationVenueForOwner(supabase, user.id, {
      organisationSlug: organisation,
      name: body.name ?? "",
      addressLine1: body.addressLine1,
      timezone: body.timezone,
    });
    return NextResponse.json({ data: { venue }, error: null });
  } catch (e) {
    if (e instanceof CreateOrganisationVenueError) {
      return NextResponse.json(
        { data: null, error: { message: e.message, status: e.status } },
        { status: e.status }
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: { message, status: 500 } },
      { status: 500 }
    );
  }
}
