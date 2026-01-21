import { db } from "@/server/db/drizzle";
import { courseTopicQuizCompletions, quizAttempts } from "@/server/db/schema";
import { eq, and, count } from "drizzle-orm";

export const topicQuizCompletionsRepo = {
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
      const currentTotalAttempts = existing[0].totalAttempts ?? 0;
      return db
        .update(courseTopicQuizCompletions)
        .set({
          passedAttemptId: data.passedAttemptId,
          lastPassedAt: now.toISOString(),
          totalAttempts: currentTotalAttempts + 1,
        })
        .where(eq(courseTopicQuizCompletions.id, existing[0].id))
        .returning();
    } else {
      // Create new completion
      // Get total attempts count
      const attemptsResult = await db
        .select({ count: count() })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, data.userId),
            eq(quizAttempts.quizId, data.quizId)
          )
        );

      const totalAttempts = (attemptsResult[0]?.count ?? 0) as number;

      return db
        .insert(courseTopicQuizCompletions)
        .values({
          userId: data.userId,
          topicId: data.topicId,
          quizId: data.quizId,
          passedAttemptId: data.passedAttemptId,
          firstPassedAt: now.toISOString(),
          lastPassedAt: now.toISOString(),
          totalAttempts: totalAttempts + 1,
        })
        .returning();
    }
  },
};
