import { stockCountSchedulesService } from "@/server/stock-counts/stock-count-schedules.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;

  try {
    const data = await stockCountSchedulesService.get(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const body = (await request.json()) as {
    cadence?: string;
    defaultScopeType?: "full" | "location" | "cycle" | "category";
    defaultScopeFilter?: Record<string, unknown>;
    defaultAssigneeUserId?: string | null;
    isPaused?: boolean;
  };

  try {
    const data = await stockCountSchedulesService.upsert(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ...body,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
