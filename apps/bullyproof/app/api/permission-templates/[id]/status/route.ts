import { NextResponse } from "next/server";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const result = await permissionTemplatesService.getSchoolActiveStatus(
      { userId },
      id
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized")
      ? 403
      : String(msg).includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
