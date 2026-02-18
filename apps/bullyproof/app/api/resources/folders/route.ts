import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const folder = await resourcesService.createFolder({ userId }, body);
    return NextResponse.json(folder, { status: 201 });
  } catch (e: any) {
    console.error("[resources/folders] POST error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message?.includes("required") ||
              e.message?.includes("Invalid") ||
              e.message?.includes("match")
            ? 400
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
