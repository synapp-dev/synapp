/**
 * Content Types admin API (module M1).
 *
 * - GET  /api/admin/content-types  - list all content types (any authenticated user)
 * - POST /api/admin/content-types  - create a content type (requires /admin/content)
 *
 * POST accepts an optional `sourceContentTypeId` to deep-copy an existing type's
 * whole tree as a template.
 *
 * Responses: 200/201 on success; 400 invalid body; 401 unauthenticated;
 * 403 lacking /admin/content; 404 unknown source type; 409 duplicate name.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { contentTypesService } from "@/server/content-types/content-types.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { contentTypeErrorResponse } from "./errors";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const types = await contentTypesService.list({ userId });
    return NextResponse.json(types, { status: 200 });
  } catch (e: any) {
    return contentTypeErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const created = await contentTypesService.create({ userId }, body);
    return NextResponse.json(created, { status: 201 });
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
