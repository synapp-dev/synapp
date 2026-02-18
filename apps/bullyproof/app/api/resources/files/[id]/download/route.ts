import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
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
    const result = await resourcesService.getDownloadUrl({ userId }, id);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[resources/files/:id/download] GET error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "File not found"
          ? 404
          : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
