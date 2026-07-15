import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import {
  deleteCalendarEvent,
  updateCalendarEvent,
  type CalendarEventInput,
} from "@/server/forecast/calendar-events.service";

type RouteParams = { organisation: string; venue: string; eventId: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }
  const { organisation, venue, eventId } = await context.params;
  const input = (await request.json()) as CalendarEventInput;
  try {
    const data = await updateCalendarEvent(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      id: eventId,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "forecast-events", {
      defaultCode: "forecast_events.failed",
    });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }
  const { organisation, venue, eventId } = await context.params;
  try {
    await deleteCalendarEvent(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      id: eventId,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error, "forecast-events", {
      defaultCode: "forecast_events.failed",
    });
  }
}
