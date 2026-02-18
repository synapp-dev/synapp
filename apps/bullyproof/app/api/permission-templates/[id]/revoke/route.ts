import { NextResponse } from "next/server";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { schoolIds } = body;
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return NextResponse.json(
        { error: "schoolIds array is required and must not be empty" },
        { status: 400 }
      );
    }
    const validIds = schoolIds.filter(
      (s: unknown): s is string => typeof s === "string"
    );
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "At least one valid school ID is required" },
        { status: 400 }
      );
    }
    const result = await permissionTemplatesService.revokeFromSchools(
      { userId },
      id,
      validIds
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
