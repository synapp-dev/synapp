import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { certificationTopicProgressRepo } from "@/server/certification-topic-progress/certification-topic-progress.repo";
import { certificationAnswersRepo } from "@/server/certification-answers/certification-answers.repo";
import { certificationSlidesRepo } from "@/server/certification-slides/certification-slides.repo";
import { certificationRepo } from "@/server/certification/certification.repo";
import { certificationTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;

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

    return NextResponse.json({ attempt: latestAttempt });
  } catch (error) {
    console.error("Error fetching topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();
    const { currentSlideId } = body;

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

    // Check for in-progress attempt
    let attempt = await certificationTopicProgressRepo.getInProgressAttempt(
      user.id,
      stageId,
      topicId
    );

    // If no in-progress attempt, create a new one
    if (!attempt) {
      attempt = await certificationTopicProgressRepo.createAttempt(
        user.id,
        stageId,
        topicId,
        currentSlideId
      );

      // Mark first slide as viewed if provided
      if (currentSlideId) {
        await certificationTopicProgressRepo.markSlideViewed(
          attempt.id,
          currentSlideId
        );
      }
    } else if (currentSlideId) {
      // Get all slides for this topic to validate access
      const slides = await certificationSlidesRepo.getByTopicId(topicId);
      const slideIds = slides.map((s) => s.id);

      // Check if slide is unlocked (allow if topic is completed for review)
      if (attempt.status !== "completed") {
        const isUnlocked = await certificationTopicProgressRepo.isSlideUnlocked(
          attempt.id,
          currentSlideId,
          slideIds
        );

        if (!isUnlocked) {
          return NextResponse.json(
            { error: "Slide is locked. Complete previous slides first." },
            { status: 403 }
          );
        }
      }

      // Mark slide as viewed when navigating to it
      await certificationTopicProgressRepo.markSlideViewed(
        attempt.id,
        currentSlideId
      );

      const updated = await certificationTopicProgressRepo.updateCurrentSlide(
        attempt.id,
        currentSlideId
      );
      attempt = updated[0] ?? attempt;
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Error creating/updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();
    const { currentSlideId, status, scorePercentage } = body;

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

    // Update current slide if provided
    if (currentSlideId) {
      // Get all slides for this topic to validate access
      const slides = await certificationSlidesRepo.getByTopicId(topicId);
      const slideIds = slides.map((s) => s.id);

      // Check if slide is unlocked (allow if topic is completed for review)
      if (latestAttempt.status !== "completed") {
        const isUnlocked = await certificationTopicProgressRepo.isSlideUnlocked(
          latestAttempt.id,
          currentSlideId,
          slideIds
        );

        if (!isUnlocked) {
          return NextResponse.json(
            { error: "Slide is locked. Complete previous slides first." },
            { status: 403 }
          );
        }
      }

      // Mark slide as viewed when navigating to it
      await certificationTopicProgressRepo.markSlideViewed(
        latestAttempt.id,
        currentSlideId
      );

      await certificationTopicProgressRepo.updateCurrentSlide(
        latestAttempt.id,
        currentSlideId
      );
    }

    // Update status if provided
    if (status) {
      let calculatedScore = scorePercentage;

      // If completing and no score provided, calculate it from quiz answers
      if (status === "completed" && calculatedScore === undefined) {
        try {
          // Get all answers for this attempt
          const answers = await certificationAnswersRepo.getByAttempt(
            latestAttempt.id
          );

          // Get all slides for this topic to count quiz slides
          const slides = await certificationSlidesRepo.getByTopicId(topicId);
          const quizSlides = slides.filter((slide) => slide.kind === "quiz");

          if (quizSlides.length > 0) {
            // Count correct answers (only count one answer per quiz slide - the latest)
            const slideAnswers = new Map<string, boolean>();
            answers.forEach((answer) => {
              // Keep the latest answer for each slide
              if (!slideAnswers.has(answer.slideId)) {
                slideAnswers.set(answer.slideId, answer.isCorrect);
              }
            });

            // Count correct answers for quiz slides only
            let correctCount = 0;
            quizSlides.forEach((slide) => {
              const isCorrect = slideAnswers.get(slide.id);
              if (isCorrect === true) {
                correctCount++;
              }
            });

            // Calculate percentage
            calculatedScore = Math.round(
              (correctCount / quizSlides.length) * 100
            );
          } else {
            // No quiz slides, set score to null
            calculatedScore = null;
          }
        } catch (error) {
          console.error("Error calculating score:", error);
          // If calculation fails, set score to null
          calculatedScore = null;
        }
      }

      await certificationTopicProgressRepo.updateStatus(
        latestAttempt.id,
        status,
        calculatedScore
      );
    }

    // Return updated attempt
    const updated = await certificationTopicProgressRepo.getById(
      latestAttempt.id
    );

    return NextResponse.json({ attempt: updated[0] });
  } catch (error) {
    console.error("Error updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

