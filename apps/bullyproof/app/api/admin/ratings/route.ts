import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { adminRatingsService } from "@/server/lesson-feedback/admin-ratings.service";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stageSlug = searchParams.get("stageSlug")?.trim();
    if (!stageSlug) {
      return NextResponse.json(
        { error: "Missing required query param: stageSlug" },
        { status: 400 }
      );
    }

    const payload = await adminRatingsService.listRatingsByStageSlug(
      { userId },
      stageSlug
    );

    if (!payload) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stage ratings";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
