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
    const { schoolIds, roleIds } = body;
    const validSchoolIds = Array.isArray(schoolIds)
      ? schoolIds.filter((s: unknown): s is string => typeof s === "string")
      : [];
    const validRoleIds = Array.isArray(roleIds)
      ? roleIds.filter((r: unknown): r is string => typeof r === "string")
      : [];
    if (validSchoolIds.length === 0 && validRoleIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Either schoolIds or roleIds array is required and must not be empty",
        },
        { status: 400 }
      );
    }
    const result =
      validSchoolIds.length > 0
        ? await permissionTemplatesService.revokeFromSchools(
            { userId },
            id,
            validSchoolIds
          )
        : await permissionTemplatesService.revokeFromPlatformRoles(
            { userId },
            id,
            validRoleIds
          );
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
