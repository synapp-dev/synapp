import { db } from "@/server/db/drizzle";
import { courseTopicQuizzes } from "@/server/db/schema";
import { eq, asc, sql, desc, and, ne } from "drizzle-orm";
import { createSlug } from "@/utils/slug";

export const courseTopicQuizzesRepo = {
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

  getByTopicIdAndSlug: (topicId: string, slug: string) =>
    db
      .select()
      .from(courseTopicQuizzes)
      .where(
        and(
          eq(courseTopicQuizzes.topicId, topicId),
          eq(courseTopicQuizzes.slug, slug)
        )
      )
      .limit(1),

  getByIdEnriched: async (id: string) => {
    const result = await db.execute(
      sql`SELECT * FROM v_quiz_enriched WHERE id = ${id} LIMIT 1`
    );
    
    if (result.length === 0) {
      return [];
    }

    const row = result[0] as any;
    
    // Transform snake_case to camelCase for the main quiz object
    const transformedQuiz = {
      id: row.id,
      topicId: row.topic_id,
      title: row.title,
      description: row.description,
      passingScorePercentage: row.passing_score_percentage,
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      isRequired: row.is_required,
      sequenceType: row.sequence_type,
      sortOrder: row.sort_order,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      questions: Array.isArray(row.questions) ? row.questions.map((q: any) => ({
        id: q.id,
        quizId: q.quiz_id,
        questionText: q.question_text,
        questionType: q.question_type,
        allowMultipleSelections: q.allow_multiple_selections,
        explanation: q.explanation,
        points: q.points,
        orderIndex: q.order_index,
        questionUrls: q.question_urls,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        answers: Array.isArray(q.answers) ? q.answers.map((a: any) => ({
          id: a.id,
          questionId: a.question_id,
          answerText: a.answer_text,
          isCorrect: a.is_correct,
          orderIndex: a.order_index,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        })) : [],
      })) : [],
    };

    return [transformedQuiz];
  },

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
    let baseSlug = createSlug(data.title);
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

  update: async (
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
  ) => {
    // If title is being updated, regenerate slug
    if (data.title) {
      const existing = await db
        .select()
        .from(courseTopicQuizzes)
        .where(eq(courseTopicQuizzes.id, id))
        .limit(1);

      if (existing.length > 0) {
        const topicId = existing[0].topicId;
        let baseSlug = createSlug(data.title);
        let finalSlug = baseSlug;
        let counter = 1;

        // Check for slug collisions within the same topic (excluding current quiz)
        while (true) {
          const collision = await db
            .select()
            .from(courseTopicQuizzes)
            .where(
              and(
                eq(courseTopicQuizzes.topicId, topicId),
                eq(courseTopicQuizzes.slug, finalSlug),
                ne(courseTopicQuizzes.id, id)
              )
            )
            .limit(1);

          if (collision.length === 0) {
            break;
          }

          counter++;
          finalSlug = `${baseSlug}-${counter}`;
        }

        return db
          .update(courseTopicQuizzes)
          .set({
            ...data,
            slug: finalSlug,
            updatedAt: sql`now()`,
          })
          .where(eq(courseTopicQuizzes.id, id))
          .returning();
      }
    }

    return db
      .update(courseTopicQuizzes)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicQuizzes.id, id))
      .returning();
  },

  delete: (id: string) =>
    db.delete(courseTopicQuizzes).where(eq(courseTopicQuizzes.id, id)),
};
