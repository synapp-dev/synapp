import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { parseMenuItemsListQuery } from "@/lib/api/parse-list-query";
import {
  menuItemsService,
  type UpsertMenuItemInput,
} from "@/server/menu-items/menu-items.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const params = parseMenuItemsListQuery(new URL(request.url).searchParams);

  try {
    const data = await menuItemsService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ...params,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "menu-items");
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
  const payload = (await request.json()) as UpsertMenuItemInput;

  try {
    const data = await menuItemsService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input: payload,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return serviceErrorResponse(error, "menu-items");
  }
}
