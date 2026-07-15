
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";

import {
  recipesService,
  type UpsertRecipeInput,
} from "@/server/recipes/recipes.service";

type RouteParams = {
  organisation: string;
  venue: string;
  recipeId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, recipeId } = await context.params;

  try {
    const data = await recipesService.getById(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
    });

    if (!data) {
      return validationErrorResponse("Recipe not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "recipes");
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

  const { organisation, venue, recipeId } = await context.params;
  const payload = (await request.json()) as UpsertRecipeInput;

  try {
    const data = await recipesService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
      input: payload,
    });

    if (!data) {
      return validationErrorResponse("Recipe not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "recipes");
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

  const { organisation, venue, recipeId } = await context.params;

  try {
    const deleted = await recipesService.delete(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
    });

    if (!deleted) {
      return validationErrorResponse("Recipe not found", 404);
    }

    return jsonDataResponse({ deleted: true });
  } catch (error) {
    return serviceErrorResponse(error, "recipes");
  }
}
