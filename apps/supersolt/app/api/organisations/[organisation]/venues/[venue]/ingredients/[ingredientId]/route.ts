
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";

import {
  ingredientsService,
  type UpsertIngredientInput,
} from "@/server/ingredients/ingredients.service";

type RouteParams = {
  organisation: string;
  venue: string;
  ingredientId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, ingredientId } = await context.params;

  try {
    const data = await ingredientsService.getById(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
    });

    if (!data) {
      return validationErrorResponse("Ingredient not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "ingredients");
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

  const { organisation, venue, ingredientId } = await context.params;
  const payload = (await request.json()) as UpsertIngredientInput;

  try {
    const data = await ingredientsService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
      input: payload,
    });

    if (!data) {
      return validationErrorResponse("Ingredient not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "ingredients");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, ingredientId } = await context.params;

  try {
    const deleted = await ingredientsService.delete(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
    });

    if (!deleted) {
      return validationErrorResponse("Ingredient not found", 404);
    }

    return jsonDataResponse({ deleted: true });
  } catch (error) {
    return serviceErrorResponse(error, "ingredients");
  }
}
