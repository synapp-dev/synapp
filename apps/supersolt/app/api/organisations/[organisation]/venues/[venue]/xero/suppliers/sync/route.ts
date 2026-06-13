import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { syncVenueXeroSuppliers } from "@/server/xero/xero-suppliers.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    const result = await syncVenueXeroSuppliers(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });

    console.info("[xero] POST sync suppliers", {
      organisation,
      venue,
      fetchedFromXero: result.fetchedFromXero,
      created: result.created,
      updated: result.updated,
      linkedInvoices: result.linkedInvoices,
      error: result.error,
    });

    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "xero/suppliers/sync");
  }
}
