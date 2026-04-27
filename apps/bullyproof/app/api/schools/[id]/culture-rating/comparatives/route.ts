import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";
import { cultureComparativeBodySchema } from "@/server/culture-ratings/culture-ratings.validators";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: schoolId } = await ctx.params;
    const json = await request.json();
    const body = cultureComparativeBodySchema.parse(json);
    const row = await cultureRatingsService.createComparative(
      { userId },
      schoolId,
      body,
      { asSchoolUser: true }
    );
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create comparative period";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("overlap")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Invalid body", details: e }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
