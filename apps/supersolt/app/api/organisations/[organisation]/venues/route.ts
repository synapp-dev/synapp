import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";

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
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation } = await context.params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return validationErrorResponse("Invalid JSON", 400);
  }

  try {
    const venue = await createOrganisationVenueForOwner(ctx, {
      organisationSlug: organisation,
      name: body.name ?? "",
      addressLine1: body.addressLine1,
      timezone: body.timezone,
    });
    return jsonDataResponse({ venue });
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
