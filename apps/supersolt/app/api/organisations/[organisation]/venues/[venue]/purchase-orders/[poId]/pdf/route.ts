import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse } from "@/lib/api/service-error-response";
import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";

type RouteParams = {
  organisation: string;
  venue: string;
  poId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, poId } = await context.params;

  try {
    const { fileName, bytes } = await purchaseOrdersService.buildPdf(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      poId,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serviceErrorResponse(error, "purchase-orders");
  }
}
