import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { certificationAnswersRepo } from "@/server/certification-answers/certification-answers.repo";
import { certificationTopicProgressRepo } from "@/server/certification-topic-progress/certification-topic-progress.repo";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      stageId,
      topicId,
      slideId,
      attemptId,
      answerId,
      isCorrect,
      timeTaken,
    } = body;

    if (!stageId || !topicId || !slideId || typeof isCorrect !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use upsert to update existing answer or create new one
    const answer = await certificationAnswersRepo.upsertAnswer({
      userId: user.id,
      stageId,
      topicId,
      slideId,
      attemptId,
      answerId,
      isCorrect,
      timeTaken,
    });

    // Mark slide as answered in slideProgress to unlock next slide
    if (attemptId) {
      try {
        await certificationTopicProgressRepo.markSlideAnswered(
          attemptId,
          slideId
        );
      } catch (error) {
        // Log error but don't fail the request if marking as answered fails
        console.error("Error marking slide as answered:", error);
      }
    }

    return NextResponse.json({ answer: answer[0] });
  } catch (error) {
    console.error("Error creating answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

