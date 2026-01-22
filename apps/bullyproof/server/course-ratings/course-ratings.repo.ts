import { db } from "@/server/db/drizzle";
import { courseRatings } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const courseRatingsRepo = {
  getByUserAndCourse: (userId: string, courseId: string) =>
    db
      .select()
      .from(courseRatings)
      .where(
        and(
          eq(courseRatings.userId, userId),
          eq(courseRatings.courseId, courseId)
        )
      )
      .limit(1),

  create: async (
    userId: string,
    courseId: string,
    rating: number,
    comment?: string | null,
    questionMetadata?: Record<string, any> | null
  ) => {
    const result = await db
      .insert(courseRatings)
      .values({
        userId,
        courseId,
        rating,
        comment: comment || null,
        questionMetadata: questionMetadata || null,
      })
      .returning();

    return result[0];
  },

  update: async (
    userId: string,
    courseId: string,
    rating: number,
    comment?: string | null,
    questionMetadata?: Record<string, any> | null
  ) => {
    const result = await db
      .update(courseRatings)
      .set({
        rating,
        comment: comment || null,
        questionMetadata: questionMetadata !== undefined ? questionMetadata : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(courseRatings.userId, userId),
          eq(courseRatings.courseId, courseId)
        )
      )
      .returning();

    return result[0];
  },

  upsert: async (
    userId: string,
    courseId: string,
    rating: number,
    comment?: string | null,
    questionMetadata?: Record<string, any> | null
  ) => {
    // Check if rating exists
    const existing = await courseRatingsRepo.getByUserAndCourse(
      userId,
      courseId
    );

    if (existing.length > 0) {
      return courseRatingsRepo.update(userId, courseId, rating, comment, questionMetadata);
    } else {
      return courseRatingsRepo.create(userId, courseId, rating, comment, questionMetadata);
    }
  },

  getByCourse: (courseId: string) =>
    db
      .select()
      .from(courseRatings)
      .where(eq(courseRatings.courseId, courseId)),
};
