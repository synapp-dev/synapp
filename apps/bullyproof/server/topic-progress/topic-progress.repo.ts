import { db } from "@/server/db/drizzle";
import { topicProgress, courseTopicSlides } from "@/server/db/schema";
import { eq, and, desc, max, sql } from "drizzle-orm";

export const topicProgressRepo = {
  getLatestAttempt: async (
    userId: string,
    courseId: string,
    topicId: string
  ) => {
    const result = await db
      .select()
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.courseId, courseId),
          eq(topicProgress.topicId, topicId)
        )
      )
      .orderBy(desc(topicProgress.attemptNumber))
      .limit(1);

    return result[0] ?? null;
  },

  getInProgressAttempt: async (
    userId: string,
    courseId: string,
    topicId: string
  ) => {
    const result = await db
      .select()
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.courseId, courseId),
          eq(topicProgress.topicId, topicId),
          sql`status IN ('not_started', 'viewing_slides', 'quiz_unlocked')`
        )
      )
      .orderBy(desc(topicProgress.attemptNumber))
      .limit(1);

    return result[0] ?? null;
  },

  createAttempt: async (
    userId: string,
    courseId: string,
    topicId: string,
    currentSlideId?: string
  ) => {
    const maxAttemptResult = await db
      .select({
        maxAttempt: max(topicProgress.attemptNumber),
      })
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.courseId, courseId),
          eq(topicProgress.topicId, topicId)
        )
      );

    const nextAttemptNumber = (maxAttemptResult[0]?.maxAttempt ?? 0) + 1;

    // Get slide order index if slideId provided
    let currentSlideIndex: number | null = null;
    if (currentSlideId) {
      const slide = await db
        .select({ orderIndex: courseTopicSlides.orderIndex })
        .from(courseTopicSlides)
        .where(eq(courseTopicSlides.id, currentSlideId))
        .limit(1);
      currentSlideIndex = slide[0]?.orderIndex ?? null;
    }

    try {
      const result = await db
        .insert(topicProgress)
        .values({
          userId,
          courseId,
          topicId,
          attemptNumber: nextAttemptNumber,
          currentSlideId: currentSlideId ?? null,
          currentSlideIndex,
          status: "viewing_slides",
        })
        .returning();

      return result[0];
    } catch (error: any) {
      // Handle duplicate key violation (race condition)
      // PostgreSQL error code 23505 is unique_violation
      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        // Fetch and return the existing attempt
        const existingAttempt = await db
          .select()
          .from(topicProgress)
          .where(
            and(
              eq(topicProgress.userId, userId),
              eq(topicProgress.courseId, courseId),
              eq(topicProgress.topicId, topicId),
              eq(topicProgress.attemptNumber, nextAttemptNumber)
            )
          )
          .limit(1);

        if (existingAttempt[0]) {
          return existingAttempt[0];
        }
      }
      // Re-throw if it's not a duplicate key error or if we couldn't find the existing attempt
      throw error;
    }
  },

  updateCurrentSlide: async (attemptId: string, slideId: string) => {
    // Get slide order index
    const slide = await db
      .select({ orderIndex: courseTopicSlides.orderIndex })
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.id, slideId))
      .limit(1);

    const slideIndex = slide[0]?.orderIndex ?? null;

    return db
      .update(topicProgress)
      .set({
        currentSlideId: slideId,
        currentSlideIndex: slideIndex,
        status: sql`CASE WHEN status = 'not_started' THEN 'viewing_slides' ELSE status END`,
        updatedAt: sql`now()`,
      })
      .where(eq(topicProgress.id, attemptId))
      .returning();
  },

  updateStatus: (
    attemptId: string,
    status: "not_started" | "viewing_slides" | "quiz_unlocked" | "completed",
    options?: {
      slidesCompletedAt?: Date | null;
      quizUnlockedAt?: Date | null;
      completedAt?: Date | null;
    }
  ) => {
    const updateData: any = {
      status,
      updatedAt: sql`now()`,
    };

    if (options?.slidesCompletedAt !== undefined) {
      updateData.slidesCompletedAt = options.slidesCompletedAt;
    }
    if (options?.quizUnlockedAt !== undefined) {
      updateData.quizUnlockedAt = options.quizUnlockedAt;
    }
    if (options?.completedAt !== undefined) {
      updateData.completedAt = options.completedAt;
    }

    return db
      .update(topicProgress)
      .set(updateData)
      .where(eq(topicProgress.id, attemptId))
      .returning();
  },

  markSlideViewed: async (attemptId: string, slideId: string) => {
    const attempt = await db
      .select({ slideProgress: topicProgress.slideProgress })
      .from(topicProgress)
      .where(eq(topicProgress.id, attemptId))
      .limit(1);

    if (attempt.length === 0) {
      throw new Error("Attempt not found");
    }

    const slideProgress = (attempt[0].slideProgress as Record<string, any>) || {};
    slideProgress[slideId] = {
      viewed: true,
      viewedAt: new Date().toISOString(),
    };

    return db
      .update(topicProgress)
      .set({
        slideProgress: slideProgress,
        updatedAt: sql`now()`,
      })
      .where(eq(topicProgress.id, attemptId))
      .returning();
  },

  isSlideUnlocked: async (
    attemptId: string,
    slideId: string,
    allSlideIds: string[]
  ) => {
    const attempt = await db
      .select({
        currentSlideIndex: topicProgress.currentSlideIndex,
        slideProgress: topicProgress.slideProgress,
      })
      .from(topicProgress)
      .where(eq(topicProgress.id, attemptId))
      .limit(1);

    if (attempt.length === 0) return false;

    const slideProgress = (attempt[0].slideProgress as Record<string, any>) || {};
    const slideIndex = allSlideIds.indexOf(slideId);

    // Check if slide is already viewed
    if (slideProgress[slideId]?.viewed) {
      return true;
    }

    // Check if it's the next slide in sequence
    const currentIndex = attempt[0].currentSlideIndex ?? -1;
    return slideIndex <= currentIndex + 1;
  },

  getByCourse: (userId: string, courseId: string) =>
    db
      .select()
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.courseId, courseId)
        )
      )
      .orderBy(topicProgress.topicId, desc(topicProgress.attemptNumber)),

  getById: (attemptId: string) =>
    db
      .select()
      .from(topicProgress)
      .where(eq(topicProgress.id, attemptId))
      .limit(1),
};
