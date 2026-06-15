
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { listVenueInvoices } from "@/server/invoices/invoices.service";


type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const view = url.searchParams.get("view") as "pending_review" | "all" | null;
  const fromDate = url.searchParams.get("from")?.trim() || undefined;
  const toDate = url.searchParams.get("to")?.trim() || undefined;
  const status = url.searchParams.get("status")?.trim() || undefined;
  const supplierId = url.searchParams.get("supplierId")?.trim() || undefined;

  try {
    const data = await listVenueInvoices(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      view: view ?? undefined,
      fromDate,
      toDate,
      status,
      supplierId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
