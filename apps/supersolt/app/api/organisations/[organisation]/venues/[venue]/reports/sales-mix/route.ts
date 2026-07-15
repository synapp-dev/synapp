import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { getSalesMixReportData } from "@/server/sales/sales-insights-summary.service";
import { buildSalesMixPdf } from "@/server/sales/sales-mix-pdf.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "-");
}

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
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
    return validationErrorResponse(
      "Query params from and to (YYYY-MM-DD, from <= to) are required",
    );
  }

  try {
    const data = await getSalesMixReportData(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      from,
      to,
    });
    const pdf = await buildSalesMixPdf(data);
    const filename = `sales-mix-${safeFilenamePart(venue)}-${from}-to-${to}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serviceErrorResponse(error, "sales-mix-report");
  }
}
