import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { bulkApproveInvoices } from "@/server/invoices/invoices.service";


type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { invoiceIds?: string[] };

  if (!body.invoiceIds?.length) {
    return NextResponse.json(
      { data: null, error: { message: "invoiceIds required", status: 400 } },
      { status: 400 },
    );
  }

  try {
    const data = await bulkApproveInvoices(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceIds: body.invoiceIds,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
