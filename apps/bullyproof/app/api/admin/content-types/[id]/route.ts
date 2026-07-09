/**
 * Content Types admin API - single type (module M1).
 *
 * - PATCH  /api/admin/content-types/[id]  - rename and/or edit levels (requires /admin/content)
 * - DELETE /api/admin/content-types/[id]  - delete a type (requires /admin/content)
 *
 * DELETE returns 409 `{ code: "in_use" }` when the type is used by any school or
 * has authored topics, and rejects deleting the Default type.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { contentTypesService } from "@/server/content-types/content-types.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { contentTypeErrorResponse } from "../errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const updated = await contentTypesService.update({ userId }, id, body);
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: e.flatten() },
        { status: 400 },
      );
    }
    return contentTypeErrorResponse(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const result = await contentTypesService.delete({ userId }, id);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return contentTypeErrorResponse(e);
  }
}
