import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import {
  getVenueInvoiceDetail,
  parseInvoiceAttachmentIfNeeded,
} from "@/server/invoices/invoices.service";

type RouteParams = { organisation: string; venue: string; invoiceId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId } = await context.params;

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = body.force === true;
  } catch {
    force = false;
  }

  try {
    const result = await parseInvoiceAttachmentIfNeeded(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      force,
    });

    const detail = await getVenueInvoiceDetail(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
    });

    return jsonDataResponse({ ...result, detail });
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
