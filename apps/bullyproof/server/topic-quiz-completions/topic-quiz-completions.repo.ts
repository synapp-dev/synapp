import { db } from "@/server/db/drizzle";
import { topicQuizCompletions, quizAttempts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const topicQuizCompletionsRepo = {
  getByUserAndTopic: (userId: string, topicId: string) =>
    db
      .select()
      .from(topicQuizCompletions)
      .where(
        and(
          eq(topicQuizCompletions.userId, userId),
          eq(topicQuizCompletions.topicId, topicId)
        )
      ),

  getByUserAndQuiz: (userId: string, quizId: string) =>
    db
      .select()
      .from(topicQuizCompletions)
      .where(
        and(
          eq(topicQuizCompletions.userId, userId),
          eq(topicQuizCompletions.quizId, quizId)
        )
      )
      .limit(1),

  markQuizPassed: async (data: {
    userId: string;
    topicId: string;
    quizId: string;
    passedAttemptId: string;
  }) => {
    const existing = await db
      .select()
      .from(topicQuizCompletions)
      .where(
        and(
          eq(topicQuizCompletions.userId, data.userId),
          eq(topicQuizCompletions.quizId, data.quizId)
        )
      )
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      // Update existing completion
      return db
        .update(topicQuizCompletions)
        .set({
          passedAttemptId: data.passedAttemptId,
          lastPassedAt: now.toISOString(),
          totalAttempts: db.$count(topicQuizCompletions.totalAttempts) + 1,
        })
        .where(eq(topicQuizCompletions.id, existing[0].id))
        .returning();
    } else {
      // Create new completion
      // Get total attempts count
      const attemptsResult = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, data.userId),
            eq(quizAttempts.quizId, data.quizId)
          )
        );

      return db
        .insert(topicQuizCompletions)
        .values({
          userId: data.userId,
          topicId: data.topicId,
          quizId: data.quizId,
          passedAttemptId: data.passedAttemptId,
          firstPassedAt: now.toISOString(),
          lastPassedAt: now.toISOString(),
          totalAttempts: attemptsResult.length,
        })
        .returning();
    }
  },
};
