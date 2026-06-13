
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { confirmInvoice } from "@/server/invoices/invoices.service";
import type { ConfirmInvoiceInput } from "@/entities/invoices/model/types";


type RouteParams = { organisation: string; venue: string; invoiceId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ConfirmInvoiceInput;

  try {
    const data = await confirmInvoice(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      input: body,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
