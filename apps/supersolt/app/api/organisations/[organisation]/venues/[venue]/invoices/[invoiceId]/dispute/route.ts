import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { disputeInvoice } from "@/server/invoices/invoices.service";
import type { DisputeReason } from "@/entities/invoices/model/types";


type RouteParams = { organisation: string; venue: string; invoiceId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, invoiceId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: DisputeReason;
    notes?: string;
  };

  if (!body.reason) {
    return NextResponse.json(
      { data: null, error: { message: "reason is required", status: 400 } },
      { status: 400 },
    );
  }

  try {
    const data = await disputeInvoice(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      reason: body.reason,
      notes: body.notes,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
