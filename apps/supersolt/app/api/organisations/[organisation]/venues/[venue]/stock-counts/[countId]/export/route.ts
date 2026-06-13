import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; countId: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, countId } = await context.params;

  try {
    const csv = await stockCountsService.exportCsv(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      countId,
    });
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="stock-count-${countId}.csv"`,
      },
    });
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
