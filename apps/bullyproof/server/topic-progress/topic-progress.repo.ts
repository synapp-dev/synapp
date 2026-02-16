import { db } from "@/server/db/drizzle";
import { courseTopicProgress, courseTopicSlides } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const topicProgressRepo = {
  getLatestAttempt: async (
    userId: string,
    courseId: string,
    topicId: string
  ) => {
    const result = await db
      .select()
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId),
          eq(courseTopicProgress.topicId, topicId)
        )
      )
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
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId),
          eq(courseTopicProgress.topicId, topicId),
          sql`status IN ('not_started', 'viewing_slides', 'quiz_unlocked')`
        )
      )
      .limit(1);

    return result[0] ?? null;
  },

  createAttempt: async (
    userId: string,
    courseId: string,
    topicId: string,
    currentSlideId?: string
  ) => {
    // Get slide index (position in ordered list) if slideId provided
    let currentSlideIndex: number | null = null;
    if (currentSlideId) {
      const allSlides = await db
        .select({ id: courseTopicSlides.id })
        .from(courseTopicSlides)
        .where(eq(courseTopicSlides.topicId, topicId))
        .orderBy(courseTopicSlides.position);
      const idx = allSlides.findIndex((s) => s.id === currentSlideId);
      currentSlideIndex = idx >= 0 ? idx : null;
    }

    try {
      const result = await db
        .insert(courseTopicProgress)
        .values({
          userId,
          courseId,
          topicId,
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
          .from(courseTopicProgress)
          .where(
            and(
              eq(courseTopicProgress.userId, userId),
              eq(courseTopicProgress.courseId, courseId),
              eq(courseTopicProgress.topicId, topicId)
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
    const slideRow = await db
      .select({ topicId: courseTopicSlides.topicId })
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.id, slideId))
      .limit(1);
    if (!slideRow[0]) {
      throw new Error("Slide not found");
    }
    const allSlides = await db
      .select({ id: courseTopicSlides.id })
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, slideRow[0].topicId))
      .orderBy(courseTopicSlides.position);
    const slideIndex = allSlides.findIndex((s) => s.id === slideId);

    return db
      .update(courseTopicProgress)
      .set({
        currentSlideId: slideId,
        currentSlideIndex: slideIndex >= 0 ? slideIndex : null,
        status: sql`CASE WHEN status = 'not_started' THEN 'viewing_slides' ELSE status END`,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicProgress.id, attemptId))
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
      .update(courseTopicProgress)
      .set(updateData)
      .where(eq(courseTopicProgress.id, attemptId))
      .returning();
  },

  markSlideViewed: async (attemptId: string, slideId: string) => {
    const attempt = await db
      .select({ slideProgress: courseTopicProgress.slideProgress })
      .from(courseTopicProgress)
      .where(eq(courseTopicProgress.id, attemptId))
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
      .update(courseTopicProgress)
      .set({
        slideProgress: slideProgress,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicProgress.id, attemptId))
      .returning();
  },

  isSlideUnlocked: async (
    attemptId: string,
    slideId: string,
    allSlideIds: string[]
  ) => {
    const attempt = await db
      .select({
        currentSlideIndex: courseTopicProgress.currentSlideIndex,
        slideProgress: courseTopicProgress.slideProgress,
      })
      .from(courseTopicProgress)
      .where(eq(courseTopicProgress.id, attemptId))
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
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId)
        )
      )
      .orderBy(courseTopicProgress.topicId),

  getById: (attemptId: string) =>
    db
      .select()
      .from(courseTopicProgress)
      .where(eq(courseTopicProgress.id, attemptId))
      .limit(1),
};
