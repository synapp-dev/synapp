import { NextResponse } from "next/server";
import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  countId: string;
  entryId: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, countId, entryId } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { data: null, error: { message: "file is required", status: 400 } },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const data = await stockCountsService.uploadEntryPhoto(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      countId,
      entryId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
