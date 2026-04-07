import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
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

  const { organisation, venue, menuItemId } = await context.params;

  try {
    const data = await menuItemsService.getById(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
    });
    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Menu item not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof MenuItemsServiceError) {
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

  const { organisation, venue, menuItemId } = await context.params;
  const payload = (await request.json()) as UpsertMenuItemInput;

  try {
    const data = await menuItemsService.update(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
      input: payload,
    });
    if (!data) {
      return NextResponse.json(
        { data: null, error: { message: "Menu item not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof MenuItemsServiceError) {
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

  const { organisation, venue, menuItemId } = await context.params;

  try {
    const deleted = await menuItemsService.delete(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
    });
    if (!deleted) {
      return NextResponse.json(
        { data: null, error: { message: "Menu item not found", status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    if (error instanceof MenuItemsServiceError) {
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
