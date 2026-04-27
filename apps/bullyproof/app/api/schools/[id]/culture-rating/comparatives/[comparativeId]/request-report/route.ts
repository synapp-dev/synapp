import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; comparativeId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: schoolId, comparativeId } = await ctx.params;
    const row = await cultureRatingsService.requestReport(
      { userId },
      schoolId,
      comparativeId,
      { asSchoolUser: true }
    );
    return NextResponse.json(row, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to request report";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
