import { db } from "@/server/db/drizzle";
import { courseTopicQuizzes } from "@/server/db/schema";
import { eq, asc, sql, desc, and } from "drizzle-orm";
import { createSlug } from "@/utils/slug";

export const topicQuizzesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(courseTopicQuizzes)
      .where(eq(courseTopicQuizzes.topicId, topicId))
      .orderBy(asc(courseTopicQuizzes.sortOrder)),

  getById: (id: string) =>
    db
      .select()
      .from(courseTopicQuizzes)
      .where(eq(courseTopicQuizzes.id, id))
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
        .from(courseTopicQuizzes)
        .where(eq(courseTopicQuizzes.topicId, data.topicId))
        .orderBy(desc(courseTopicQuizzes.sortOrder));

      const maxOrder = existingQuizzes.length > 0 ? existingQuizzes[0].sortOrder : -1;
      data.sortOrder = maxOrder + 1;
    }

    // Generate slug from title, handling collisions
    const baseSlug = createSlug(data.title);
    let finalSlug = baseSlug;
    let counter = 1;

    // Check for slug collisions within the same topic
    while (true) {
      const existing = await db
        .select()
        .from(courseTopicQuizzes)
        .where(
          and(
            eq(courseTopicQuizzes.topicId, data.topicId),
            eq(courseTopicQuizzes.slug, finalSlug)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        break;
      }

      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    return db.insert(courseTopicQuizzes).values({
      topicId: data.topicId,
      title: data.title,
      description: data.description ?? null,
      passingScorePercentage: data.passingScorePercentage ?? 70,
      timeLimitMinutes: data.timeLimitMinutes ?? null,
      maxAttempts: data.maxAttempts ?? null,
      isRequired: data.isRequired ?? true,
      sequenceType: data.sequenceType ?? "sequential",
      sortOrder: data.sortOrder,
      slug: finalSlug,
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
      .update(courseTopicQuizzes)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicQuizzes.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(courseTopicQuizzes).where(eq(courseTopicQuizzes.id, id)),
};
