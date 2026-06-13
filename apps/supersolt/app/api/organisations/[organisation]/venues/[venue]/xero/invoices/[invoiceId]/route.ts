
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

import { getVenueXeroInvoiceDetail } from "@/server/xero/xero-invoices.service";

type RouteParams = {
  organisation: string;
  venue: string;
  invoiceId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, invoiceId } = await context.params;

  try {
    const result = await getVenueXeroInvoiceDetail(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "xero/invoices");
  }
}
