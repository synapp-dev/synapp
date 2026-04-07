import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  recipesService,
  RecipesServiceError,
  type UpsertRecipeInput,
} from "@/server/recipes/recipes.service";

type RouteParams = {
  organisation: string;
  venue: string;
  recipeId: string;
};

async function getUserId() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

export async function GET(
  _request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue, recipeId } = await context.params;

  try {
    const data = await recipesService.getById(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
    });

    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Recipe not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof RecipesServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue, recipeId } = await context.params;
  const payload = (await request.json()) as UpsertRecipeInput;

  try {
    const data = await recipesService.update(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
      input: payload,
    });

    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Recipe not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof RecipesServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue, recipeId } = await context.params;

  try {
    const deleted = await recipesService.delete(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
    });

    if (!deleted) {
      return NextResponse.json(
        { data: null, error: { message: "Recipe not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    if (error instanceof RecipesServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}
