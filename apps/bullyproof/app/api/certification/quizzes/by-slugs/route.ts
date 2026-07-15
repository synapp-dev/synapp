/**
 * Quiz by Slugs API route handler.
 *
 * Exposes HTTP endpoints for fetching quiz data by course slug, topic slug, and quiz slug.
 * Returns quiz, attempt, answers, and earliest unanswered question in a single response.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read quiz data.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/by-slugs?course=[courseSlug]&topic=[topicSlug]&quiz=[quizSlug] - Get quiz with all related data
 *
 * Responses:
 * - 200 OK: Returns quiz data with attempt, answers, and earliest unanswered question index.
 * - 404 Not Found: Course, topic, or quiz not found.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import { courseTopicsRepo } from "@/server/course-topics/course-topics.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { quizAttemptAnswersRepo } from "@/server/quiz-attempt-answers/quiz-attempt-answers.repo";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { createSlug } from "@/utils/slug";

/**
 * Handle GET /api/certification/quizzes/by-slugs?course=[courseSlug]&topic=[topicSlug]&quiz=[quizSlug]
 *
 * Returns quiz data with attempt, existing answers, and earliest unanswered question index.
 * All data is returned in a single response to minimize API calls.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with quiz, attempt, answers, and earliest unanswered question index.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("course");
    const topicSlug = searchParams.get("topic");
    const quizSlug = searchParams.get("quiz");

    if (!courseSlug || !topicSlug || !quizSlug) {
      return NextResponse.json(
        { error: "Course, topic, and quiz slug query parameters are required" },
        { status: 400 }
      );
    }

    // 1. Find course by slug
    const courses = await certificationCoursesRepo.getCourseBySlug(courseSlug);
    if (courses.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const course = courses[0];

    // 2. Find topic by course code and topic slug
    const allTopics = await courseTopicsRepo.getByCourseCode(course.code);
    const foundTopic = allTopics.find(
      (t) => createSlug(t.title) === topicSlug
    );

    if (!foundTopic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // 3. Find quiz by topic ID and quiz slug
    const quizzes = await courseTopicQuizzesRepo.getByTopicIdAndSlug(
      foundTopic.id,
      quizSlug
    );

    if (quizzes.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const foundQuiz = quizzes[0];

    // 4. Get enriched quiz data (includes questions and answers)
    const enrichedQuizzes = await courseTopicQuizzesRepo.getByIdEnriched(
      foundQuiz.id
    );

    if (enrichedQuizzes.length === 0) {
      return NextResponse.json({ error: "Quiz data not found" }, { status: 404 });
    }

    const enrichedQuiz = enrichedQuizzes[0];

    // 5. Get or create quiz attempt
    let attempt = await quizAttemptsRepo.getInProgressAttempt(
      user.id,
      foundQuiz.id
    );

    if (!attempt) {
      // Get topic progress to find topicProgressId
      const topicProgress = await courseTopicProgressRepo.getProgress(
        user.id,
        course.id,
        foundTopic.id
      );

      try {
        attempt = await quizAttemptsRepo.createAttempt({
          userId: user.id,
          quizId: foundQuiz.id,
          topicId: foundTopic.id,
          courseId: course.id,
          topicProgressId: topicProgress?.id ?? null,
        });
      } catch (createError: any) {
        // Handle race condition - attempt might have been created between check and create
        const errorMessage = createError?.message || createError?.cause?.message || "";
        const errorCode = createError?.code || createError?.cause?.code;
        
        if (
          createError.message?.includes("in-progress") ||
          errorMessage.includes("in-progress")
        ) {
          attempt = await quizAttemptsRepo.getInProgressAttempt(
            user.id,
            foundQuiz.id
          );
        } else if (
          errorCode === "23505" ||
          errorCode === 23505 ||
          errorMessage.includes("duplicate key") ||
          errorMessage.includes("unique constraint") ||
          errorMessage.includes("quiz_attempts_user_quiz_attempt_unique")
        ) {
          // Duplicate key error - another request created the attempt, try to fetch it
          // This handles the case where retry logic exhausted but attempt was created
          attempt = await quizAttemptsRepo.getInProgressAttempt(
            user.id,
            foundQuiz.id
          );
          // If still no attempt, it might have been completed, get latest
          if (!attempt) {
            const latestAttempt = await quizAttemptsRepo.getLatestAttempt(
              user.id,
              foundQuiz.id
            );
            // If latest exists and is completed, create a new one (retry once more)
            if (latestAttempt && latestAttempt.completedAt) {
              // Wait a bit and retry once
              await new Promise((resolve) => setTimeout(resolve, 100));
              attempt = await quizAttemptsRepo.createAttempt({
                userId: user.id,
                quizId: foundQuiz.id,
                topicId: foundTopic.id,
                courseId: course.id,
                topicProgressId: topicProgress?.id ?? null,
              });
            }
          }
        } else {
          throw createError;
        }
      }
    }

    // 6. Get existing answers for the attempt
    let existingAnswers: any[] = [];
    if (attempt) {
      const answers = await quizAttemptAnswersRepo.getByAttempt(attempt.id);
      existingAnswers = answers;
    }

    // 7. Find earliest unanswered question
    const questions = enrichedQuiz.questions || [];
    const answeredQuestionIds = new Set(
      existingAnswers.map((a) => a.questionId)
    );

    let earliestUnansweredQuestionIndex = -1;
    for (let i = 0; i < questions.length; i++) {
      if (!answeredQuestionIds.has(questions[i].id)) {
        earliestUnansweredQuestionIndex = i;
        break;
      }
    }

    // If all questions are answered, default to first question (index 0)
    if (earliestUnansweredQuestionIndex === -1 && questions.length > 0) {
      earliestUnansweredQuestionIndex = 0;
    }

    // Return everything in one response
    return NextResponse.json(
      {
        quiz: enrichedQuiz,
        attempt,
        existingAnswers,
        earliestUnansweredQuestionIndex,
        course,
        topic: foundTopic,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching quiz by slugs:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
