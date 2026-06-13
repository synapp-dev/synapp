
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { updateInvoiceLineMapping } from "@/server/invoices/invoices.service";


type RouteParams = {
  organisation: string;
  venue: string;
  invoiceId: string;
  lineId: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId, lineId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    supplierProductId?: string | null;
    ingredientId?: string | null;
  };

  try {
    const data = await updateInvoiceLineMapping(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      lineId,
      supplierProductId: body.supplierProductId,
      ingredientId: body.ingredientId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
