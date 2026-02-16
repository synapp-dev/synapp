/**
 * Admin API: Normalize slide positions (recompute fractional positions).
 *
 * POST /api/admin/migrations/backfill-slide-positions
 * - Requires /admin/content feature access
 */

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { runBackfillSlidePositions } from "@/server/migrations/backfill-slide-positions";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdminContent = await checkFeatureAccess(userId, "/admin/content");
    if (!hasAdminContent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await runBackfillSlidePositions();

    return NextResponse.json({
      success: true,
      result: {
        topicSlides: result.topicSlides,
        courseTopicSlides: result.courseTopicSlides,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("[backfill-slide-positions]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
