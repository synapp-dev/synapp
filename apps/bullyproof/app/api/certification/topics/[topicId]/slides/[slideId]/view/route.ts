import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string; slideId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId, slideId } = await params;

    // Get topic to find courseId
    const topic = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    if (!topic[0]) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const courseId = topic[0].courseId;

    // Get latest attempt
    const latestAttempt = await courseTopicProgressRepo.getLatestAttempt(
      user.id,
      courseId,
      topicId
    );

    if (!latestAttempt) {
      return NextResponse.json(
        { error: "No attempt found" },
        { status: 404 }
      );
    }

    // Mark slide as viewed
    await courseTopicProgressRepo.markSlideViewed(latestAttempt.id, slideId);
    await userSlideViewsRepo.markSlideViewed({
      userId: user.id,
      slideId,
      topicId,
      courseId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking slide as viewed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

