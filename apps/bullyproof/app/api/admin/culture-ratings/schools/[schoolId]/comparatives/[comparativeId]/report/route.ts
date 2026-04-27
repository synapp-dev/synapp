import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ schoolId: string; comparativeId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId, comparativeId } = await ctx.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const displayNameRaw = formData.get("displayName");
    const displayName =
      typeof displayNameRaw === "string" && displayNameRaw.trim()
        ? displayNameRaw.trim()
        : "culture-rating-report.pdf";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const row = await cultureRatingsService.deliverReport(
      { userId },
      schoolId,
      comparativeId,
      file,
      displayName
    );
    return NextResponse.json(row, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to upload report";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (
      message.includes("required") ||
      message.includes("not found") ||
      message.includes("PDF")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
