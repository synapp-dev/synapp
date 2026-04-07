import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  ingredientsService,
  IngredientsServiceError,
  type UpsertIngredientInput,
} from "@/server/ingredients/ingredients.service";

type RouteParams = {
  organisation: string;
  venue: string;
  ingredientId: string;
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

  const { organisation, venue, ingredientId } = await context.params;

  try {
    const data = await ingredientsService.getById(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
    });

    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Ingredient not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof IngredientsServiceError) {
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

  const { organisation, venue, ingredientId } = await context.params;
  const payload = (await request.json()) as UpsertIngredientInput;

  try {
    const data = await ingredientsService.update(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
      input: payload,
    });

    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Ingredient not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof IngredientsServiceError) {
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

  const { organisation, venue, ingredientId } = await context.params;

  try {
    const deleted = await ingredientsService.delete(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId,
    });

    if (!deleted) {
      return NextResponse.json(
        { data: null, error: { message: "Ingredient not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    if (error instanceof IngredientsServiceError) {
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
