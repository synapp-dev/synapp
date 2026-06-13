import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { requireVenueScope } from "@/server/access/require-venue-scope";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import { loadSquareConnectionForVenue } from "@/server/sales/sales-insights.service";
import {
  assertManualSyncAllowed,
  runIncrementalSquareSync,
} from "@/server/square/square-sync.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let venueContext;
  try {
    venueContext = await requireVenueScope(ctx, organisation, venue);
  } catch (error) {
    return serviceErrorResponse(error, "square/sync");
  }

  const state = await forecastRepo.getVenueForecastStateAdmin(
    ctx.appDb,
    venueContext.venueId,
  );

  try {
    assertManualSyncAllowed(state?.lastPaymentsSyncAt);
  } catch (error) {
    return validationErrorResponse(
      error instanceof Error ? error.message : "Sync cooldown active",
      429,
    );
  }

  const connection = await loadSquareConnectionForVenue(
    ctx.appDb,
    venueContext.venueId,
  );
  if (!connection) {
    return validationErrorResponse("Square is not connected for this venue", 400);
  }

  try {
    const result = await runIncrementalSquareSync(ctx.appDb, {
      venueId: venueContext.venueId,
      organisationId: venueContext.organisationId,
      timezone: venueContext.timezone,
      accessToken: connection.squareAccessToken,
      environment: connection.environment,
      locationId: connection.squareLocationId,
      dataStartsFrom: state?.dataStartsFrom ?? null,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "square/sync");
  }
}
