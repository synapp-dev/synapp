import { db } from "@/server/db/drizzle";
import { quizAttempts, courseTopicQuizzes, quizQuestions, quizAnswers, quizAttemptAnswers, vQuizAttemptsEnriched } from "@/server/db/schema";
import { eq, and, desc, max, sql, count, inArray } from "drizzle-orm";

export const quizAttemptsRepo = {
  getLatestAttempt: async (userId: string, quizId: string) => {
    const result = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId)
        )
      )
      .orderBy(desc(quizAttempts.attemptNumber))
      .limit(1);

    return result[0] ?? null;
  },

  getInProgressAttempt: async (userId: string, quizId: string) => {
    const result = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId),
          sql`completed_at IS NULL`
        )
      )
      .orderBy(desc(quizAttempts.startedAt))
      .limit(1);

    return result[0] ?? null;
  },

  createAttempt: async (data: {
    userId: string;
    quizId: string;
    topicId: string;
    courseId: string;
    topicProgressId?: string | null;
  }) => {
    // CRITICAL: Check for in-progress attempts first - never create a new attempt if one exists
    const inProgress = await quizAttemptsRepo.getInProgressAttempt(
      data.userId,
      data.quizId
    );

    if (inProgress) {
      throw new Error(
        "An in-progress quiz attempt already exists. Please resume the existing attempt."
      );
    }

    // Get total questions count
    const questionsResult = await db
      .select({ count: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, data.quizId));

    const totalQuestions = questionsResult[0]?.count ?? 0;

    // Get quiz to check if time limit exists
    const quiz = await db
      .select()
      .from(courseTopicQuizzes)
      .where(eq(courseTopicQuizzes.id, data.quizId))
      .limit(1);

    // Retry logic to handle race conditions when multiple requests try to create attempts simultaneously
    const maxRetries = 10;
    for (let retry = 0; retry < maxRetries; retry++) {
      // Get ALL existing attempt numbers (both completed and in-progress)
      // This ensures we don't create duplicate attempt numbers
      const allAttemptsResult = await db
        .select({
          attemptNumber: quizAttempts.attemptNumber,
        })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, data.userId),
            eq(quizAttempts.quizId, data.quizId)
          )
        );

      const existingAttemptNumbers = new Set(
        allAttemptsResult.map((r) => r.attemptNumber)
      );

      // Find the next available attempt number starting from 1
      let nextAttemptNumber = 1;
      while (existingAttemptNumbers.has(nextAttemptNumber)) {
        nextAttemptNumber++;
        // Safety limit to prevent infinite loops (e.g., if there are 1000+ attempts)
        if (nextAttemptNumber > 10000) {
          throw new Error(
            "Unable to find available attempt number. Please contact support."
          );
        }
      }

      // Log for debugging
      if (retry > 0) {
        console.log(
          `Retry ${retry + 1}: Existing attempt numbers: [${Array.from(existingAttemptNumbers).sort((a, b) => a - b).join(", ")}], Next: ${nextAttemptNumber}`
        );
      }

      try {
        const result = await db
          .insert(quizAttempts)
          .values({
            userId: data.userId,
            quizId: data.quizId,
            topicId: data.topicId,
            courseId: data.courseId,
            topicProgressId: data.topicProgressId ?? null,
            attemptNumber: nextAttemptNumber,
            totalQuestions,
            correctAnswers: 0,
            timeLimitStartedAt: quiz[0]?.timeLimitMinutes ? sql`now()` : null,
          })
          .returning();

        return result[0];
      } catch (insertError: any) {
        // Check if it's a duplicate key error (PostgreSQL error code 23505)
        // Drizzle may wrap the error in different ways, so check multiple locations
        // Also check nested error objects and string representations
        const errorCode =
          insertError?.code ||
          insertError?.cause?.code ||
          insertError?.originalError?.code;
        const errorMessage =
          insertError?.message ||
          insertError?.cause?.message ||
          insertError?.originalError?.message ||
          String(insertError) ||
          "";
        
        // Check error code (string or number)
        const isDuplicateKeyByCode =
          errorCode === "23505" ||
          errorCode === 23505 ||
          errorCode === "unique_violation";
        
        // Check error message for key phrases (case insensitive)
        const errorMessageLower = errorMessage.toLowerCase();
        const isDuplicateKeyByMessage =
          errorMessageLower.includes("duplicate key") ||
          errorMessageLower.includes("unique constraint") ||
          errorMessageLower.includes("quiz_attempts_user_quiz_attempt_unique") ||
          errorMessageLower.includes("23505");

        if (isDuplicateKeyByCode || isDuplicateKeyByMessage) {
          // Another request created an attempt with this number between our check and insert
          // Retry with a fresh check of existing attempts
          console.log(
            `Duplicate key error detected on retry ${retry + 1}/${maxRetries} (attempt_number: ${nextAttemptNumber}), retrying with fresh attempt number check...`
          );
          if (retry === maxRetries - 1) {
            // Last retry failed, throw a more helpful error
            console.error(
              `Failed to create quiz attempt after ${maxRetries} retries. Error:`,
              insertError
            );
            throw new Error(
              `Failed to create quiz attempt after ${maxRetries} retries due to race condition. Please try again.`
            );
          }
          // Wait a small random amount to reduce collision probability
          // Increase wait time slightly with each retry
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100 + 20 * (retry + 1))
          );
          continue; // Retry the loop
        }
        // Not a duplicate key error, log and rethrow
        console.error("Non-duplicate key error during attempt creation:", insertError);
        throw insertError;
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new Error("Failed to create quiz attempt: unexpected error");
  },

  updateAnswer: async (
    attemptId: string,
    questionId: string,
    answerId: string,
    isCorrect: boolean
  ) => {
    // This will be handled by quiz-attempt-answers repo, but we update correct_answers count here
    const attempt = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId))
      .limit(1);

    if (attempt.length === 0) {
      throw new Error("Attempt not found");
    }

    // Recalculate correct answers count
    const correctCountResult = await db
      .select({ count: count() })
      .from(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, attemptId),
          eq(quizAttemptAnswers.isCorrect, true)
        )
      );

    const correctAnswers = correctCountResult[0]?.count ?? 0;

    return db
      .update(quizAttempts)
      .set({
        correctAnswers,
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();
  },

  calculateScore: async (attemptId: string) => {
    const attempt = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId))
      .limit(1);

    if (attempt.length === 0) {
      throw new Error("Attempt not found");
    }

    const quiz = await db
      .select()
      .from(courseTopicQuizzes)
      .where(eq(courseTopicQuizzes.id, attempt[0].quizId))
      .limit(1);

    if (quiz.length === 0) {
      throw new Error("Quiz not found");
    }

    // Get all questions for this quiz
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, attempt[0].quizId));

    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      throw new Error("Quiz has no questions");
    }

    // Get all user-selected answers for this attempt
    const userAnswers = await db
      .select()
      .from(quizAttemptAnswers)
      .where(eq(quizAttemptAnswers.attemptId, attemptId));

    // Group user answers by question
    // Handle both old format (answerId) and new format (answerIds JSONB)
    const answersByQuestion = new Map<string, string[]>();
    for (const userAnswer of userAnswers) {
      if (!answersByQuestion.has(userAnswer.questionId)) {
        answersByQuestion.set(userAnswer.questionId, []);
      }
      
      // Extract answer IDs from JSONB array or fall back to single answerId
      let answerIds: string[] = [];
      if (userAnswer.answerIds) {
        // New format: answerIds is a JSONB array
        answerIds = Array.isArray(userAnswer.answerIds) 
          ? userAnswer.answerIds 
          : JSON.parse(userAnswer.answerIds as any);
      } else if (userAnswer.answerId) {
        // Old format: single answerId (for backward compatibility during migration)
        answerIds = [userAnswer.answerId];
      }
      
      // Add all answer IDs for this question
      answerIds.forEach((answerId) => {
        answersByQuestion.get(userAnswer.questionId)!.push(answerId);
      });
    }

    // Count correct questions
    let correctQuestions = 0;

    for (const question of questions) {
      // Get all correct answers for this question
      const correctAnswersForQuestion = await db
        .select({ id: quizAnswers.id })
        .from(quizAnswers)
        .where(
          and(
            eq(quizAnswers.questionId, question.id),
            eq(quizAnswers.isCorrect, true)
          )
        );

      const correctAnswerIds = new Set(correctAnswersForQuestion.map((a) => a.id));
      const userSelectedAnswerIds = new Set(answersByQuestion.get(question.id) || []);

      // Question is correct if:
      // 1. All correct answers are selected
      // 2. No incorrect answers are selected
      const allCorrectSelected = correctAnswerIds.size > 0 && 
        Array.from(correctAnswerIds).every((id) => userSelectedAnswerIds.has(id));

      // Check if any incorrect answers were selected
      const allAnswersForQuestion = await db
        .select({ id: quizAnswers.id, isCorrect: quizAnswers.isCorrect })
        .from(quizAnswers)
        .where(eq(quizAnswers.questionId, question.id));

      const hasIncorrectSelected = Array.from(userSelectedAnswerIds).some((answerId) => {
        const answer = allAnswersForQuestion.find((a) => a.id === answerId);
        return answer && !answer.isCorrect;
      });

      // Question is correct only if all correct answers are selected AND no incorrect answers are selected
      if (allCorrectSelected && !hasIncorrectSelected) {
        correctQuestions++;
      }
    }

    // Calculate score percentage
    const scorePercentage =
      totalQuestions > 0
        ? Math.round((correctQuestions / totalQuestions) * 100)
        : 0;
    const isPassed = scorePercentage >= quiz[0].passingScorePercentage;

    // Calculate time taken if completed
    let timeTakenSeconds: number | null = null;
    if (attempt[0].timeLimitStartedAt) {
      const startedAt = new Date(attempt[0].timeLimitStartedAt);
      const now = new Date();
      timeTakenSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    }

    return db
      .update(quizAttempts)
      .set({
        correctAnswers: correctQuestions, // Store correct questions count
        scorePercentage,
        isPassed,
        completedAt: sql`now()`,
        timeTakenSeconds,
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();
  },

  getByUserAndQuiz: (userId: string, quizId: string) =>
    db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId)
        )
      )
      .orderBy(desc(quizAttempts.attemptNumber)),

  getById: (attemptId: string) =>
    db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId))
      .limit(1),

  // Methods using the enriched view for efficient queries
  hasPassedAttempt: async (userId: string, topicId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(vQuizAttemptsEnriched)
      .where(
        and(
          eq(vQuizAttemptsEnriched.userId, userId),
          eq(vQuizAttemptsEnriched.topicId, topicId),
          eq(vQuizAttemptsEnriched.isPassed, true)
        )
      )
      .limit(1);

    return result.length > 0;
  },

  getAttemptsByTopic: (userId: string, topicId: string) =>
    db
      .select()
      .from(vQuizAttemptsEnriched)
      .where(
        and(
          eq(vQuizAttemptsEnriched.userId, userId),
          eq(vQuizAttemptsEnriched.topicId, topicId)
        )
      )
      .orderBy(desc(vQuizAttemptsEnriched.attemptNumber)),

  // Get in-progress quiz attempt for a topic (any quiz in that topic)
  getInProgressAttemptByTopic: async (userId: string, topicId: string) => {
    const result = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.topicId, topicId),
          sql`completed_at IS NULL`
        )
      )
      .orderBy(desc(quizAttempts.startedAt))
      .limit(1);

    return result[0] ?? null;
  },
};
