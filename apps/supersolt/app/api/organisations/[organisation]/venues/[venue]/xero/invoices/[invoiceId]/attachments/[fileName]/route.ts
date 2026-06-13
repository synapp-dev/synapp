import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse } from "@/lib/api/service-error-response";

import { downloadVenueXeroInvoiceAttachment } from "@/server/xero/xero-invoices.service";

type RouteParams = {
  organisation: string;
  venue: string;
  invoiceId: string;
  fileName: string;
};

function contentDispositionAttachment(fileName: string): string {
  const safeAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, invoiceId, fileName } = await context.params;
  const decodedFileName = decodeURIComponent(fileName);

  try {
    const result = await downloadVenueXeroInvoiceAttachment(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      invoiceId,
      fileName: decodedFileName,
    });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { message: result.message, status: result.status } },
        { status: result.status },
      );
    }

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": contentDispositionAttachment(result.fileName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serviceErrorResponse(error, "xero/invoices");
  }
}
