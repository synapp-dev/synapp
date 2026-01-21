import { db } from "@/server/db/drizzle";
import { topicQuizzes, courseTopics } from "@/server/db/schema";
import { eq, asc, sql, desc } from "drizzle-orm";

export const topicQuizzesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(topicQuizzes)
      .where(eq(topicQuizzes.topicId, topicId))
      .orderBy(asc(topicQuizzes.sortOrder)),

  getById: (id: string) =>
    db
      .select()
      .from(topicQuizzes)
      .where(eq(topicQuizzes.id, id))
      .limit(1),

  create: async (data: {
    topicId: string;
    title: string;
    description?: string | null;
    passingScorePercentage?: number;
    timeLimitMinutes?: number | null;
    maxAttempts?: number | null;
    isRequired?: boolean;
    sequenceType?: "sequential" | "user_choice";
    sortOrder?: number;
  }) => {
    // If sortOrder not provided, calculate next available
    if (data.sortOrder === undefined || data.sortOrder === null) {
      const existingQuizzes = await db
        .select()
        .from(topicQuizzes)
        .where(eq(topicQuizzes.topicId, data.topicId))
        .orderBy(desc(topicQuizzes.sortOrder));

      const maxOrder = existingQuizzes.length > 0 ? existingQuizzes[0].sortOrder : -1;
      data.sortOrder = maxOrder + 1;
    }

    return db.insert(topicQuizzes).values({
      topicId: data.topicId,
      title: data.title,
      description: data.description ?? null,
      passingScorePercentage: data.passingScorePercentage ?? 70,
      timeLimitMinutes: data.timeLimitMinutes ?? null,
      maxAttempts: data.maxAttempts ?? null,
      isRequired: data.isRequired ?? true,
      sequenceType: data.sequenceType ?? "sequential",
      sortOrder: data.sortOrder,
    }).returning();
  },

  update: (
    id: string,
    data: {
      title?: string;
      description?: string | null;
      passingScorePercentage?: number;
      timeLimitMinutes?: number | null;
      maxAttempts?: number | null;
      isRequired?: boolean;
      sequenceType?: "sequential" | "user_choice";
      sortOrder?: number;
      status?: "draft" | "published" | "archived";
    }
  ) =>
    db
      .update(topicQuizzes)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(topicQuizzes.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(topicQuizzes).where(eq(topicQuizzes.id, id)),
};
