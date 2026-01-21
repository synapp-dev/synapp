import { db } from "@/server/db/drizzle";
import { quizAttemptAnswers, quizAnswers } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const quizAttemptAnswersRepo = {
  getByAttempt: (attemptId: string) =>
    db
      .select()
      .from(quizAttemptAnswers)
      .where(eq(quizAttemptAnswers.attemptId, attemptId))
      .orderBy(quizAttemptAnswers.questionId, quizAttemptAnswers.answeredAt),

  getByQuestion: (attemptId: string, questionId: string) =>
    db
      .select()
      .from(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, attemptId),
          eq(quizAttemptAnswers.questionId, questionId)
        )
      ),

  submitAnswer: async (data: {
    attemptId: string;
    questionId: string;
    answerId: string;
    timeTakenSeconds?: number;
  }) => {
    // Get the correct answer status
    const answer = await db
      .select({ isCorrect: quizAnswers.isCorrect })
      .from(quizAnswers)
      .where(eq(quizAnswers.id, data.answerId))
      .limit(1);

    if (answer.length === 0) {
      throw new Error("Answer not found");
    }

    // Check if any answer already exists for this question in this attempt
    const existing = await db
      .select()
      .from(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, data.attemptId),
          eq(quizAttemptAnswers.questionId, data.questionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing answer (override with new answerId)
      return db
        .update(quizAttemptAnswers)
        .set({
          answerId: data.answerId,
          isCorrect: answer[0].isCorrect,
          timeTakenSeconds: data.timeTakenSeconds ?? null,
          updatedAt: sql`now()`,
        })
        .where(eq(quizAttemptAnswers.id, existing[0].id))
        .returning();
    } else {
      // Create new answer
      return db
        .insert(quizAttemptAnswers)
        .values({
          attemptId: data.attemptId,
          questionId: data.questionId,
          answerId: data.answerId,
          isCorrect: answer[0].isCorrect,
          timeTakenSeconds: data.timeTakenSeconds ?? null,
        })
        .returning();
    }
  },

  removeAnswer: (attemptId: string, questionId: string, answerId: string) =>
    db
      .delete(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, attemptId),
          eq(quizAttemptAnswers.questionId, questionId),
          eq(quizAttemptAnswers.answerId, answerId)
        )
      ),
};
