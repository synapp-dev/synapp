import { supplierRawItemsService } from "@/server/supplier-raw-items/supplier-raw-items.service";
import type { ApproveRawItemsInput } from "@/server/supplier-raw-items/supplier-raw-items.schemas";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  supplierId: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const payload = (await request.json()) as ApproveRawItemsInput;

  try {
    const data = await supplierRawItemsService.approveMany(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      input: payload,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "supplier-raw-items/approve");
  }
}
