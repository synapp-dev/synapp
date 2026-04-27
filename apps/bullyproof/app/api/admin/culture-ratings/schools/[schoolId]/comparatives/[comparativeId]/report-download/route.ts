import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ schoolId: string; comparativeId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId, comparativeId } = await ctx.params;
    const payload = await cultureRatingsService.getReportSignedUrl(
      { userId },
      schoolId,
      comparativeId
    );
    return NextResponse.json(payload, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create download link";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("not available") || message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
