import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { assertUserHasVenueAccess, VenueAccessError } from "@/server/access/venue-access";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { userIsOrgAdmin } from "@/server/square/assert-org-admin";

type RouteParams = {
  organisation: string;
  venue: string;
};

type CatalogLinkRow = {
  id: string;
  menu_item_id: string;
  square_catalog_object_id: string;
  menu_item_name: string | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<RouteParams> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  const venueContext = await ingredientsRepo.getVenueContextBySlugs(
    supabase,
    organisation,
    venue
  );
  if (!venueContext) {
    return NextResponse.json(
      { data: null, error: { message: "Venue not found", status: 404 } },
      { status: 404 }
    );
  }

  try {
    await assertUserHasVenueAccess(supabase, {
      userId: user.id,
      organisationId: venueContext.organisationId,
      venueId: venueContext.venueId,
    });
  } catch (error) {
    if (error instanceof VenueAccessError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }
    throw error;
  }

  const { data: links, error: linksError } = await supabase
    .from("menu_item_square_catalog_links")
    .select("id, menu_item_id, square_catalog_object_id")
    .eq("venue_id", venueContext.venueId)
    .order("created_at", { ascending: false });

  if (linksError) {
    console.error("[square catalog links] list", linksError);
    return NextResponse.json(
      { data: null, error: { message: "Could not load catalog links", status: 500 } },
      { status: 500 }
    );
  }

  const menuIds = [...new Set((links ?? []).map((l) => l.menu_item_id))];
  const nameById = new Map<string, string>();
  if (menuIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("menu_items")
      .select("id, name")
      .in("id", menuIds);

    if (!itemsError && items) {
      for (const it of items) {
        nameById.set(it.id, it.name);
      }
    }
  }

  const data: CatalogLinkRow[] = (links ?? []).map((l) => ({
    id: l.id,
    menu_item_id: l.menu_item_id,
    square_catalog_object_id: l.square_catalog_object_id,
    menu_item_name: nameById.get(l.menu_item_id) ?? null,
  }));

  return NextResponse.json({ data, error: null });
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;

  const venueContext = await ingredientsRepo.getVenueContextBySlugs(
    supabase,
    organisation,
    venue
  );
  if (!venueContext) {
    return NextResponse.json(
      { data: null, error: { message: "Venue not found", status: 404 } },
      { status: 404 }
    );
  }

  const isAdmin = await userIsOrgAdmin(supabase, user.id, venueContext.organisationId);
  if (!isAdmin) {
    return NextResponse.json(
      { data: null, error: { message: "Org admin required", status: 403 } },
      { status: 403 }
    );
  }

  let body: { menuItemId?: string; squareCatalogObjectId?: string };
  try {
    body = (await request.json()) as { menuItemId?: string; squareCatalogObjectId?: string };
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const menuItemId = body.menuItemId?.trim() ?? "";
  const squareCatalogObjectId = body.squareCatalogObjectId?.trim() ?? "";
  if (!menuItemId || !squareCatalogObjectId) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "menuItemId and squareCatalogObjectId are required", status: 400 },
      },
      { status: 400 }
    );
  }

  const { data: menuRow, error: menuError } = await supabase
    .from("menu_items")
    .select("id, venue_id, organisation_id")
    .eq("id", menuItemId)
    .eq("venue_id", venueContext.venueId)
    .maybeSingle();

  if (menuError || !menuRow) {
    return NextResponse.json(
      { data: null, error: { message: "Menu line not found for this venue", status: 404 } },
      { status: 404 }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("menu_item_square_catalog_links")
    .insert({
      organisation_id: menuRow.organisation_id,
      venue_id: venueContext.venueId,
      menu_item_id: menuItemId,
      square_catalog_object_id: squareCatalogObjectId,
      updated_at: new Date().toISOString(),
    })
    .select("id, menu_item_id, square_catalog_object_id")
    .single();

  if (insertError) {
    const msg =
      insertError.code === "23505"
        ? "This Square catalog object id is already linked for this venue"
        : insertError.message;
    return NextResponse.json(
      { data: null, error: { message: msg, status: 409 } },
      { status: insertError.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({
    data: {
      id: inserted.id,
      menu_item_id: inserted.menu_item_id,
      square_catalog_object_id: inserted.square_catalog_object_id,
      menu_item_name: null as string | null,
    },
    error: null,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const linkId = url.searchParams.get("id")?.trim() ?? "";
  if (!linkId) {
    return NextResponse.json(
      { data: null, error: { message: "Query param id is required", status: 400 } },
      { status: 400 }
    );
  }

  const venueContext = await ingredientsRepo.getVenueContextBySlugs(
    supabase,
    organisation,
    venue
  );
  if (!venueContext) {
    return NextResponse.json(
      { data: null, error: { message: "Venue not found", status: 404 } },
      { status: 404 }
    );
  }

  const isAdmin = await userIsOrgAdmin(supabase, user.id, venueContext.organisationId);
  if (!isAdmin) {
    return NextResponse.json(
      { data: null, error: { message: "Org admin required", status: 403 } },
      { status: 403 }
    );
  }

  const { error: delError } = await supabase
    .from("menu_item_square_catalog_links")
    .delete()
    .eq("id", linkId)
    .eq("venue_id", venueContext.venueId);

  if (delError) {
    console.error("[square catalog links] delete", delError);
    return NextResponse.json(
      { data: null, error: { message: "Could not delete link", status: 500 } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { ok: true }, error: null });
}
