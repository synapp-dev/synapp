import { db } from "@/server/db/drizzle";
import { courseTopicQuizCompletions, quizAttempts } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const courseTopicQuizCompletionsRepo = {
  getByUserAndTopic: (userId: string, topicId: string) =>
    db
      .select()
      .from(courseTopicQuizCompletions)
      .where(
        and(
          eq(courseTopicQuizCompletions.userId, userId),
          eq(courseTopicQuizCompletions.topicId, topicId)
        )
      ),

  getByUserAndQuiz: (userId: string, quizId: string) =>
    db
      .select()
      .from(courseTopicQuizCompletions)
      .where(
        and(
          eq(courseTopicQuizCompletions.userId, userId),
          eq(courseTopicQuizCompletions.quizId, quizId)
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
      .from(courseTopicQuizCompletions)
      .where(
        and(
          eq(courseTopicQuizCompletions.userId, data.userId),
          eq(courseTopicQuizCompletions.quizId, data.quizId)
        )
      )
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      // Update existing completion
      return db
        .update(courseTopicQuizCompletions)
        .set({
          passedAttemptId: data.passedAttemptId,
          lastPassedAt: now.toISOString(),
          totalAttempts: sql`${courseTopicQuizCompletions.totalAttempts} + 1`,
        })
        .where(eq(courseTopicQuizCompletions.id, existing[0].id))
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
        .insert(courseTopicQuizCompletions)
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
