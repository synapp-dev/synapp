import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { cultureRatingsService } from "@/server/culture-ratings/culture-ratings.service";
import { cultureComparativeBodySchema } from "@/server/culture-ratings/culture-ratings.validators";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ schoolId: string; comparativeId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId, comparativeId } = await ctx.params;
    const json = await request.json();
    const body = cultureComparativeBodySchema.parse(json);
    const row = await cultureRatingsService.updateComparative(
      { userId },
      schoolId,
      comparativeId,
      body
    );
    return NextResponse.json(row, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update comparative period";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
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

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ schoolId: string; comparativeId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId, comparativeId } = await ctx.params;
    await cultureRatingsService.deleteComparative(
      { userId },
      schoolId,
      comparativeId
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to delete comparative period";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
