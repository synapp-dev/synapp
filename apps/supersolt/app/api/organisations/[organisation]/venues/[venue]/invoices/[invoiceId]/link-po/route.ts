
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { linkInvoiceToPo } from "@/server/invoices/invoices.service";


type RouteParams = { organisation: string; venue: string; invoiceId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    purchaseOrderId?: string | null;
    matchMethod?: "manual" | "standalone";
  };

  try {
    const data = await linkInvoiceToPo(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      purchaseOrderId: body.purchaseOrderId ?? null,
      matchMethod: body.matchMethod ?? "manual",
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
