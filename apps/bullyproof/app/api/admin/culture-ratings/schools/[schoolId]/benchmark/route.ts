import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";
import { cultureBenchmarkBodySchema } from "@/server/culture-ratings/culture-ratings.validators";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ schoolId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId } = await ctx.params;
    const json = await request.json();
    const body = cultureBenchmarkBodySchema.parse(json);
    const row = await cultureRatingsService.upsertBenchmark(
      { userId },
      schoolId,
      body
    );
    return NextResponse.json(row, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to save benchmark";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Invalid body", details: e }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
