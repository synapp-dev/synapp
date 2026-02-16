/**
 * PUT /api/topics/[id]/slides/order - Reorder slides by slideIds array.
 *
 * Body: { slideIds: string[] }
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: topicId } = await params;
    const body = await request.json();
    await topicsService.reorderSlides(
      { userId },
      { topicId, slideIds: body.slideIds }
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
