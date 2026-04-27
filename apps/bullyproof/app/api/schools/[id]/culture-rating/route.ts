import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: schoolId } = await ctx.params;
    const detail = await cultureRatingsService.getSchoolDetailForSchoolUser(
      { userId },
      schoolId
    );
    return NextResponse.json(detail, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to load culture rating data";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
