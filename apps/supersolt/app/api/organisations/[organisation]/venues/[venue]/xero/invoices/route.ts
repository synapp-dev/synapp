
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

import { listVenueXeroInvoices } from "@/server/xero/xero-invoices.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

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
  const fromDate = url.searchParams.get("from")?.trim() || undefined;
  const toDate = url.searchParams.get("to")?.trim() || undefined;

  try {
    const result = await listVenueXeroInvoices(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromDate,
      toDate,
    });

    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "xero/invoices");
  }
}
