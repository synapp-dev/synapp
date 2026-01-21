import { db } from "@/server/db/drizzle";
// TODO: Migrate to new schema - certificationUserTopicProgress table doesn't exist anymore
// This file needs to be updated to use courseTopicProgress instead
import { eq, and, desc, max, sql } from "drizzle-orm";

// Temporary type definition until migration is complete
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const certificationUserTopicProgress: any = {};

export const certificationTopicProgressRepo = {
  /**
   * Get the latest attempt for a user/topic
   */
  getLatestAttempt: async (
    userId: string,
    stageId: string,
    topicId: string
  ) => {
    const result = await db
      .select()
      .from(certificationUserTopicProgress)
      .where(
        and(
          eq(certificationUserTopicProgress.userId, userId),
          eq(certificationUserTopicProgress.stageId, stageId),
          eq(certificationUserTopicProgress.topicId, topicId)
        )
      )
      .orderBy(desc(certificationUserTopicProgress.attemptNumber))
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Get all attempts for a user/topic
   */
  getAllAttempts: (
    userId: string,
    stageId: string,
    topicId: string
  ) =>
    db
      .select()
      .from(certificationUserTopicProgress)
      .where(
        and(
          eq(certificationUserTopicProgress.userId, userId),
          eq(certificationUserTopicProgress.stageId, stageId),
          eq(certificationUserTopicProgress.topicId, topicId)
        )
      )
      .orderBy(desc(certificationUserTopicProgress.attemptNumber)),

  /**
   * Get in-progress attempt for a user/topic
   */
  getInProgressAttempt: async (
    userId: string,
    stageId: string,
    topicId: string
  ) => {
    const result = await db
      .select()
      .from(certificationUserTopicProgress)
      .where(
        and(
          eq(certificationUserTopicProgress.userId, userId),
          eq(certificationUserTopicProgress.stageId, stageId),
          eq(certificationUserTopicProgress.topicId, topicId),
          sql`status IN ('started', 'in_progress')`
        )
      )
      .orderBy(desc(certificationUserTopicProgress.attemptNumber))
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Create a new attempt for a user/topic
   */
  createAttempt: async (
    userId: string,
    stageId: string,
    topicId: string,
    currentSlideId?: string
  ) => {
    // Get the next attempt number
    const maxAttemptResult = await db
      .select({
        maxAttempt: max(certificationUserTopicProgress.attemptNumber),
      })
      .from(certificationUserTopicProgress)
      .where(
        and(
          eq(certificationUserTopicProgress.userId, userId),
          eq(certificationUserTopicProgress.stageId, stageId),
          eq(certificationUserTopicProgress.topicId, topicId)
        )
      );

    const nextAttemptNumber =
      (maxAttemptResult[0]?.maxAttempt ?? 0) + 1;

    const result = await db
      .insert(certificationUserTopicProgress)
      .values({
        userId,
        stageId,
        topicId,
        attemptNumber: nextAttemptNumber,
        currentSlideId: currentSlideId ?? null,
        status: "started",
      })
      .returning();

    return result[0];
  },

  /**
   * Update current slide position
   */
  updateCurrentSlide: (
    attemptId: string,
    slideId: string
  ) =>
    db
      .update(certificationUserTopicProgress)
      .set({
        currentSlideId: slideId,
        status: sql`CASE WHEN status = 'started' THEN 'in_progress' ELSE status END`,
        updatedAt: sql`now()`,
      })
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .returning(),

  /**
   * Update attempt status
   */
  updateStatus: (
    attemptId: string,
    status: "started" | "in_progress" | "completed" | "passed" | "failed",
    scorePercentage?: number
  ) =>
    db
      .update(certificationUserTopicProgress)
      .set({
        status,
        scorePercentage: scorePercentage ?? null,
        completedAt:
          status === "completed" || status === "passed" || status === "failed"
            ? sql`now()`
            : undefined,
        passedAt: status === "passed" ? sql`now()` : undefined,
        updatedAt: sql`now()`,
      })
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .returning(),

  /**
   * Get all topic progress for a user/stage
   */
  getByStage: (userId: string, stageId: string) =>
    db
      .select()
      .from(certificationUserTopicProgress)
      .where(
        and(
          eq(certificationUserTopicProgress.userId, userId),
          eq(certificationUserTopicProgress.stageId, stageId)
        )
      )
      .orderBy(
        certificationUserTopicProgress.topicId,
        desc(certificationUserTopicProgress.attemptNumber)
      ),

  /**
   * Get attempt by ID
   */
  getById: (attemptId: string) =>
    db
      .select()
      .from(certificationUserTopicProgress)
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .limit(1),

  /**
   * Mark a slide as viewed in the slideProgress JSONB
   */
  markSlideViewed: async (attemptId: string, slideId: string) => {
    const attempt = await db
      .select()
      .from(certificationUserTopicProgress)
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .limit(1);

    if (!attempt[0]) {
      throw new Error("Attempt not found");
    }

    const currentProgress =
      (attempt[0].slideProgress as Record<string, any>) || {};
    const slideProgress = {
      ...currentProgress,
      [slideId]: {
        ...currentProgress[slideId],
        viewed: true,
        viewedAt: new Date().toISOString(),
      },
    };

    return db
      .update(certificationUserTopicProgress)
      .set({
        slideProgress,
        updatedAt: sql`now()`,
      })
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .returning();
  },

  /**
   * Mark a slide as answered in the slideProgress JSONB
   */
  markSlideAnswered: async (attemptId: string, slideId: string) => {
    const attempt = await db
      .select()
      .from(certificationUserTopicProgress)
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .limit(1);

    if (!attempt[0]) {
      throw new Error("Attempt not found");
    }

    const currentProgress =
      (attempt[0].slideProgress as Record<string, any>) || {};
    const slideProgress = {
      ...currentProgress,
      [slideId]: {
        ...currentProgress[slideId],
        viewed: true,
        answered: true,
        viewedAt:
          currentProgress[slideId]?.viewedAt || new Date().toISOString(),
      },
    };

    return db
      .update(certificationUserTopicProgress)
      .set({
        slideProgress,
        updatedAt: sql`now()`,
      })
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .returning();
  },

  /**
   * Get array of unlocked slide IDs based on sequential progress
   */
  getUnlockedSlides: async (
    attemptId: string,
    allSlideIds: string[]
  ): Promise<string[]> => {
    const attempt = await db
      .select()
      .from(certificationUserTopicProgress)
      .where(eq(certificationUserTopicProgress.id, attemptId))
      .limit(1);

    if (!attempt[0]) {
      return allSlideIds.length > 0 ? [allSlideIds[0]] : [];
    }

    const slideProgress =
      (attempt[0].slideProgress as Record<string, any>) || {};
    const unlockedSlides: string[] = [];

    // First slide is always unlocked
    if (allSlideIds.length > 0) {
      unlockedSlides.push(allSlideIds[0]);
    }

    // Check each subsequent slide
    for (let i = 1; i < allSlideIds.length; i++) {
      const previousSlideId = allSlideIds[i - 1];
      const currentSlideId = allSlideIds[i];
      const previousProgress = slideProgress[previousSlideId];

      // Unlock if previous slide is viewed (for content) or answered (for quiz)
      if (previousProgress) {
        if (previousProgress.viewed || previousProgress.answered) {
          unlockedSlides.push(currentSlideId);
        } else {
          // Stop at first locked slide
          break;
        }
      } else {
        // Stop at first slide without progress
        break;
      }
    }

    return unlockedSlides;
  },

  /**
   * Check if a slide is unlocked for access
   */
  isSlideUnlocked: async (
    attemptId: string,
    slideId: string,
    allSlideIds: string[]
  ): Promise<boolean> => {
    // First slide is always unlocked
    if (allSlideIds.length > 0 && allSlideIds[0] === slideId) {
      return true;
    }

    const unlockedSlides = await certificationTopicProgressRepo.getUnlockedSlides(
      attemptId,
      allSlideIds
    );
    return unlockedSlides.includes(slideId);
  },
};


