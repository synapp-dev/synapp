import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId is required" },
        { status: 400 }
      );
    }

    await userSlideViewsRepo.deleteByUserAndTopic(userId, topicId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("Error deleting slide views:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
