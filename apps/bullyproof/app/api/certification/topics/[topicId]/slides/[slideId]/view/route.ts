import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { certificationTopicProgressRepo } from "@/server/certification-topic-progress/certification-topic-progress.repo";
import { certificationTopics } from "@/server/db/schema";
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

    // Get topic to find stageId
    const topic = await db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.id, topicId))
      .limit(1);

    if (!topic[0]) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const stageId = topic[0].stageId;

    // Get latest attempt
    const latestAttempt = await certificationTopicProgressRepo.getLatestAttempt(
      user.id,
      stageId,
      topicId
    );

    if (!latestAttempt) {
      return NextResponse.json(
        { error: "No attempt found" },
        { status: 404 }
      );
    }

    // Mark slide as viewed
    await certificationTopicProgressRepo.markSlideViewed(
      latestAttempt.id,
      slideId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking slide as viewed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

