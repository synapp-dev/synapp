import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const tree = await resourcesService.listTree(
      { userId },
      schoolId ? { schoolId } : {}
    );
    return NextResponse.json(tree, { status: 200 });
  } catch (e: any) {
    console.error("[resources/tree] GET error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message?.includes("Invalid")
            ? 400
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
