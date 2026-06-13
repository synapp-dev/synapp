import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import {
  menuItemsService,
  MenuItemsServiceError,
  type UpsertMenuItemInput,
} from "@/server/menu-items/menu-items.service";

type RouteParams = {
  organisation: string;
  venue: string;
  menuItemId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, menuItemId } = await context.params;

  try {
    const data = await menuItemsService.getById(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
    });
    if (!data) {
      return validationErrorResponse("Menu line not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "menu-items");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, menuItemId } = await context.params;
  const payload = (await request.json()) as UpsertMenuItemInput;

  try {
    const data = await menuItemsService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
      input: payload,
    });
    if (!data) {
      return validationErrorResponse("Menu line not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "menu-items");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, menuItemId } = await context.params;

  try {
    const deleted = await menuItemsService.delete(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
    });
    if (!deleted) {
      return validationErrorResponse("Menu line not found", 404);
    }

    return jsonDataResponse({ deleted: true });
  } catch (error) {
    return serviceErrorResponse(error, "menu-items");
  }
}
