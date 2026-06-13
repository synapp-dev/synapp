import { NextResponse } from "next/server";

import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import {
  menuCatalogLinksService,
  MenuCatalogLinksServiceError,
} from "@/server/menu-items/menu-catalog-links.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

function toApiRow(row: {
  id: string;
  menuItemId: string;
  squareCatalogObjectId: string;
  menuItemName: string | null;
}) {
  return {
    id: row.id,
    menu_item_id: row.menuItemId,
    square_catalog_object_id: row.squareCatalogObjectId,
    menu_item_name: row.menuItemName,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    const rows = await menuCatalogLinksService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(rows.map(toApiRow));
  } catch (error) {
    return serviceErrorResponse(error, "square catalog links");
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

  let body: { menuItemId?: string; squareCatalogObjectId?: string };
  try {
    body = (await request.json()) as { menuItemId?: string; squareCatalogObjectId?: string };
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 },
    );
  }

  try {
    const created = await menuCatalogLinksService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId: body.menuItemId ?? "",
      squareCatalogObjectId: body.squareCatalogObjectId ?? "",
    });
    return jsonDataResponse(toApiRow(created));
  } catch (error) {
    return serviceErrorResponse(error, "square catalog links");
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

  const { organisation, venue } = await context.params;
  const linkId = new URL(request.url).searchParams.get("id")?.trim() ?? "";

  try {
    await menuCatalogLinksService.delete(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      linkId,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    if (error instanceof MenuCatalogLinksServiceError && error.status === 400) {
      return serviceErrorResponse(error, "square catalog links");
    }
    return serviceErrorResponse(error, "square catalog links");
  }
}
