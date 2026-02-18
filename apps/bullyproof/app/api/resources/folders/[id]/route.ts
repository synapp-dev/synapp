import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function PATCH(
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
    const folder = await resourcesService.renameFolder({ userId }, id, body);
    return NextResponse.json(folder, { status: 200 });
  } catch (e: any) {
    console.error("[resources/folders/:id] PATCH error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "Folder not found"
            ? 404
            : e.message?.includes("Invalid")
              ? 400
              : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await resourcesService.deleteFolder({ userId }, id);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[resources/folders/:id] DELETE error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "Folder not found"
            ? 404
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
