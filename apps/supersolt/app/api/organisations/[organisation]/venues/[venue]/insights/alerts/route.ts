import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { listInsightsAlertsForVenue } from "@/server/insights/alerts.service";
import type { InsightsAlertModule } from "@/entities/insights/model/types";

type RouteParams = {
  organisation: string;
  venue: string;
};

const MODULES: InsightsAlertModule[] = [
  "sales",
  "labour",
  "inventory",
  "forecast",
];

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const moduleParam = url.searchParams.get("module")?.trim();

  if (moduleParam && !MODULES.includes(moduleParam as InsightsAlertModule)) {
    return validationErrorResponse("Invalid module filter");
  }

  try {
    const result = await listInsightsAlertsForVenue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      module: moduleParam as InsightsAlertModule | undefined,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/alerts");
  }
}
