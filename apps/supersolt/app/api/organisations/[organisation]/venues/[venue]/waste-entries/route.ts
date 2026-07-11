import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import {
  wasteService,
  type CreateWasteEntryInput,
} from "@/server/consumption/waste.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const sp = new URL(request.url).searchParams;
  const toIso = sp.get("to") ?? new Date().toISOString();
  const fromIso =
    sp.get("from") ?? new Date(Date.now() - 30 * 86_400_000).toISOString();

  try {
    const data = await wasteService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromIso,
      toIso,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "waste-entries", {
      defaultCode: "waste.failed",
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const input = (await request.json()) as CreateWasteEntryInput;

  try {
    const data = await wasteService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "waste-entries", {
      defaultCode: "waste.failed",
    });
  }
}
