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
    // Get total questions count
    const questionsResult = await db
      .select({ count: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, data.quizId));

    const totalQuestions = questionsResult[0]?.count ?? 0;

    // Get next attempt number
    const maxAttemptResult = await db
      .select({
        maxAttempt: max(quizAttempts.attemptNumber),
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, data.userId),
          eq(quizAttempts.quizId, data.quizId)
        )
      );

    const nextAttemptNumber = (maxAttemptResult[0]?.maxAttempt ?? 0) + 1;

    // Get quiz to check if time limit exists
    const quiz = await db
      .select()
      .from(courseTopicQuizzes)
      .where(eq(courseTopicQuizzes.id, data.quizId))
      .limit(1);

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
    const answersByQuestion = new Map<string, string[]>();
    for (const userAnswer of userAnswers) {
      if (!answersByQuestion.has(userAnswer.questionId)) {
        answersByQuestion.set(userAnswer.questionId, []);
      }
      answersByQuestion.get(userAnswer.questionId)!.push(userAnswer.answerId);
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
};
