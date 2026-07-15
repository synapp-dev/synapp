import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import type {
  CreateStockCountInput,
} from "@/server/stock-counts/stock-counts.types";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";
import { guardReadinessApiRoute } from "@/server/readiness/guard-readiness-api";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const readinessBlock = await guardReadinessApiRoute(ctx, {
    organisationSlug: organisation,
    venueSlug: venue,
    moduleId: "stock-counts",
  });
  if (readinessBlock) return readinessBlock;

  const status = new URL(request.url).searchParams.get("status") ?? "all";

  try {
    const data = await stockCountsService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      status,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const readinessBlock = await guardReadinessApiRoute(ctx, {
    organisationSlug: organisation,
    venueSlug: venue,
    moduleId: "stock-counts",
  });
  if (readinessBlock) return readinessBlock;

  const input = (await request.json()) as CreateStockCountInput;

  try {
    const data = await stockCountsService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
