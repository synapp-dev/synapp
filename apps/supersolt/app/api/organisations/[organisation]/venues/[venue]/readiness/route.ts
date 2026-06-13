import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import type { ReadinessPatchBody } from "@/entities/readiness/model/types";
import {
  getVenueReadiness,
  getVenueReadinessCompact,
  patchVenueReadinessUserState,
} from "@/server/readiness/readiness.service";
import { handleReadinessRouteError } from "@/server/readiness/readiness-route-response";
import { ReadinessServiceError } from "@/server/readiness/readiness.errors";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const view = new URL(request.url).searchParams.get("view");

  try {
    if (view === "compact") {
      const data = await getVenueReadinessCompact(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
      });
      return jsonDataResponse(data);
    }

    const data = await getVenueReadiness(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    try {
      return handleReadinessRouteError(error);
    } catch {
      return serviceErrorResponse(error, "readiness");
    }
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: ReadinessPatchBody;
  try {
    body = (await request.json()) as ReadinessPatchBody;
  } catch {
    return serviceErrorResponse(
      new ReadinessServiceError(400, "Invalid JSON body"),
      "readiness",
    );
  }

  if (
    body.action !== "dismiss_suggestion" &&
    body.action !== "mark_unlock_seen"
  ) {
    return serviceErrorResponse(
      new ReadinessServiceError(400, "Unknown readiness action"),
      "readiness",
    );
  }

  try {
    const data = await patchVenueReadinessUserState(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      body,
    });
    return jsonDataResponse(data);
  } catch (error) {
    try {
      return handleReadinessRouteError(error);
    } catch {
      return serviceErrorResponse(error, "readiness");
    }
  }
}
