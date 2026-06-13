import { NextResponse } from "next/server";

import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { squareLocationService } from "@/server/square/square-location.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: { locationId?: string };
  try {
    body = (await request.json()) as { locationId?: string };
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 },
    );
  }

  try {
    const result = await squareLocationService.setForVenue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      locationId: body.locationId ?? "",
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "square location");
  }
}
