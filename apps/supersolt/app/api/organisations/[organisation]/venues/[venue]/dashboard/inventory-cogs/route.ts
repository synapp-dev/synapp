import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import { dashboardDigestService } from "@/server/dashboard/dashboard-digest.service";

type RouteParams = { organisation: string; venue: string };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Guardrail on the prior-window comparison query, not a product limit. */
const MAX_RANGE_DAYS = 366;

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
  const fromDate = url.searchParams.get("from") ?? "";
  const toDate = url.searchParams.get("to") ?? "";

  if (
    !ISO_DATE_PATTERN.test(fromDate) ||
    !ISO_DATE_PATTERN.test(toDate) ||
    fromDate > toDate
  ) {
    return Response.json(
      { error: "from/to must be yyyy-mm-dd dates with from <= to" },
      { status: 400 },
    );
  }

  const rangeDays =
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) /
      86_400_000 +
    1;
  if (rangeDays > MAX_RANGE_DAYS) {
    return Response.json(
      { error: `Range too large (max ${MAX_RANGE_DAYS} days)` },
      { status: 400 },
    );
  }

  try {
    const data = await dashboardDigestService.getInventoryCogsRange(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromDate,
      toDate,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "dashboard-inventory-cogs");
  }
}
