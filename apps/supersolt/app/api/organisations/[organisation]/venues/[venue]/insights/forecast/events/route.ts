import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import {
  createCalendarEvent,
  listCalendarEvents,
  type CalendarEventInput,
} from "@/server/forecast/calendar-events.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }
  const { organisation, venue } = await context.params;
  try {
    const data = await listCalendarEvents(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "forecast-events", {
      defaultCode: "forecast_events.failed",
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }
  const { organisation, venue } = await context.params;
  const input = (await request.json()) as CalendarEventInput;
  try {
    const data = await createCalendarEvent(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "forecast-events", {
      defaultCode: "forecast_events.failed",
    });
  }
}
