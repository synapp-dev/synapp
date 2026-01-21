import { db } from "@/server/db/drizzle";
import { quizAnswers, quizQuestions } from "@/server/db/schema";
import { eq, asc, sql, desc } from "drizzle-orm";

export const quizAnswersRepo = {
  getByQuestionId: (questionId: string) =>
    db
      .select()
      .from(quizAnswers)
      .where(eq(quizAnswers.questionId, questionId))
      .orderBy(asc(quizAnswers.orderIndex)),

  getById: (id: string) =>
    db
      .select()
      .from(quizAnswers)
      .where(eq(quizAnswers.id, id))
      .limit(1),

  create: async (data: {
    questionId: string;
    answerText: string;
    isCorrect: boolean;
    orderIndex?: number;
  }) => {
    // If orderIndex not provided, calculate next available
    if (data.orderIndex === undefined || data.orderIndex === null) {
      const existingAnswers = await db
        .select()
        .from(quizAnswers)
        .where(eq(quizAnswers.questionId, data.questionId))
        .orderBy(desc(quizAnswers.orderIndex));

      const maxOrder = existingAnswers.length > 0 ? existingAnswers[0].orderIndex : -1;
      data.orderIndex = maxOrder + 1;
    }

    return db.insert(quizAnswers).values({
      questionId: data.questionId,
      answerText: data.answerText,
      isCorrect: data.isCorrect,
      orderIndex: data.orderIndex,
    }).returning();
  },

  update: (
    id: string,
    data: {
      answerText?: string;
      isCorrect?: boolean;
      orderIndex?: number;
    }
  ) =>
    db
      .update(quizAnswers)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(quizAnswers.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(quizAnswers).where(eq(quizAnswers.id, id)),

  reorder: async (answerIds: string[]) => {
    const updates = answerIds.map((answerId, index) => ({
      id: answerId,
      orderIndex: index,
    }));

    for (const update of updates) {
      await db
        .update(quizAnswers)
        .set({ orderIndex: update.orderIndex })
        .where(eq(quizAnswers.id, update.id));
    }

    return { success: true };
  },
};
