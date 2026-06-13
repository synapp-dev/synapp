
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { getVenueInvoiceDetail } from "@/server/invoices/invoices.service";


type RouteParams = { organisation: string; venue: string; invoiceId: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId } = await context.params;

  try {
    const data = await getVenueInvoiceDetail(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
