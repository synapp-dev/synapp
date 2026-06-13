import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { uploadAndParseInvoice } from "@/server/invoices/invoices.service";


type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  const supplierId = formData.get("supplierId")?.toString() || undefined;
  const notes = formData.get("notes")?.toString() || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { data: null, error: { message: "file is required", status: 400 } },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const data = await uploadAndParseInvoice(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
      supplierId,
      notes,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "invoices");
  }
}
