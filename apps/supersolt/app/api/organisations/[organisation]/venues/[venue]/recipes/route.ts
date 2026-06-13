import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { parseRecipesListQuery } from "@/lib/api/parse-list-query";
import {
  recipesService,
  type UpsertRecipeInput,
} from "@/server/recipes/recipes.service";

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
  const params = parseRecipesListQuery(new URL(request.url).searchParams);

  try {
    const data = await recipesService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ...params,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "recipes");
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
  const payload = (await request.json()) as UpsertRecipeInput;

  try {
    const data = await recipesService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input: payload,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return serviceErrorResponse(error, "recipes");
  }
}
