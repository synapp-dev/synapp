import { db } from "@/server/db/drizzle";
import { lessonFeedback } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const lessonFeedbackRepo = {
  getByLessonId: (lessonId: string) =>
    db
      .select()
      .from(lessonFeedback)
      .where(eq(lessonFeedback.lessonId, lessonId))
      .limit(1),

  getById: (id: string) =>
    db
      .select()
      .from(lessonFeedback)
      .where(eq(lessonFeedback.id, id))
      .limit(1),

  create: async (data: {
    lessonId: string;
    teacherUserId: string;
    rating: number;
    comments?: string | null;
  }) => {
    const [feedback] = await db
      .insert(lessonFeedback)
      .values({
        lessonId: data.lessonId,
        teacherUserId: data.teacherUserId,
        rating: data.rating,
        comments: data.comments ?? null,
      })
      .returning();
    return feedback;
  },

  update: async (
    id: string,
    data: {
      rating?: number;
      comments?: string | null;
    }
  ) => {
    const [updated] = await db
      .update(lessonFeedback)
      .set({
        rating: data.rating,
        comments: data.comments ?? null,
      })
      .where(eq(lessonFeedback.id, id))
      .returning();
    return updated;
  },

  updateByLessonId: async (
    lessonId: string,
    data: {
      rating?: number;
      comments?: string | null;
    }
  ) => {
    const [updated] = await db
      .update(lessonFeedback)
      .set({
        rating: data.rating,
        comments: data.comments ?? null,
      })
      .where(eq(lessonFeedback.lessonId, lessonId))
      .returning();
    return updated;
  },

  delete: async (id: string) => {
    await db.delete(lessonFeedback).where(eq(lessonFeedback.id, id));
  },
};

