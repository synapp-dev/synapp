import { db } from "@/server/db/drizzle";
import { quizQuestions } from "@/server/db/schema";
import { eq, asc, sql, desc } from "drizzle-orm";

export const quizQuestionsRepo = {
  getByQuizId: (quizId: string) =>
    db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.orderIndex)),

  getById: (id: string) =>
    db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, id))
      .limit(1),

  create: async (data: {
    quizId: string;
    questionText: string;
    questionType?: "multiple_choice" | "single_choice" | "true_false";
    allowMultipleSelections?: boolean;
    explanation?: string | null;
    points?: number;
    orderIndex?: number;
    questionUrls?: Record<string, string> | null;
  }) => {
    // If orderIndex not provided, calculate next available
    if (data.orderIndex === undefined || data.orderIndex === null) {
      const existingQuestions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, data.quizId))
        .orderBy(desc(quizQuestions.orderIndex));

      const maxOrder = existingQuestions.length > 0 ? existingQuestions[0].orderIndex : -1;
      data.orderIndex = maxOrder + 1;
    }

    return db.insert(quizQuestions).values({
      quizId: data.quizId,
      questionText: data.questionText,
      questionType: data.questionType ?? "multiple_choice",
      allowMultipleSelections: data.allowMultipleSelections ?? false,
      explanation: data.explanation ?? null,
      points: data.points ?? 1,
      orderIndex: data.orderIndex,
      questionUrls: data.questionUrls ?? null,
    }).returning();
  },

  update: (
    id: string,
    data: {
      questionText?: string;
      questionType?: "multiple_choice" | "single_choice" | "true_false";
      allowMultipleSelections?: boolean;
      explanation?: string | null;
      points?: number;
      orderIndex?: number;
      questionUrls?: Record<string, string> | null;
    }
  ) =>
    db
      .update(quizQuestions)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(quizQuestions.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(quizQuestions).where(eq(quizQuestions.id, id)),

  reorder: async (questionIds: string[]) => {
    const updates = questionIds.map((questionId, index) => ({
      id: questionId,
      orderIndex: index,
    }));

    for (const update of updates) {
      await db
        .update(quizQuestions)
        .set({ orderIndex: update.orderIndex })
        .where(eq(quizQuestions.id, update.id));
    }

    return { success: true };
  },
};
