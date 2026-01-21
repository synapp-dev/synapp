import { db } from "@/server/db/drizzle";
import { courseTopicProgress, courseTopicSlides, vQuizAttemptsEnriched } from "@/server/db/schema";
import { eq, and, desc, max, sql } from "drizzle-orm";

export const courseTopicProgressRepo = {
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
      .orderBy(desc(courseTopicProgress.attemptNumber))
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
      .orderBy(desc(courseTopicProgress.attemptNumber))
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
        maxAttempt: max(courseTopicProgress.attemptNumber),
      })
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId),
          eq(courseTopicProgress.topicId, topicId)
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
        .insert(courseTopicProgress)
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
          .from(courseTopicProgress)
          .where(
            and(
              eq(courseTopicProgress.userId, userId),
              eq(courseTopicProgress.courseId, courseId),
              eq(courseTopicProgress.topicId, topicId),
              eq(courseTopicProgress.attemptNumber, nextAttemptNumber)
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
      .update(courseTopicProgress)
      .set({
        currentSlideId: slideId,
        currentSlideIndex: slideIndex,
        status: sql`CASE WHEN status = 'not_started' THEN 'viewing_slides' ELSE status END`,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicProgress.id, attemptId))
      .returning();
  },

  updateStatus: async (
    attemptId: string,
    status: "not_started" | "viewing_slides" | "quiz_unlocked" | "completed",
    options?: {
      slidesCompletedAt?: Date | null;
      quizUnlockedAt?: Date | null;
      completedAt?: Date | null;
    }
  ) => {
    // Prevent downgrading from "completed" to any other status
    const currentProgress = await db
      .select({ currentStatus: courseTopicProgress.status })
      .from(courseTopicProgress)
      .where(eq(courseTopicProgress.id, attemptId))
      .limit(1);

    if (currentProgress.length > 0 && currentProgress[0].currentStatus === "completed" && status !== "completed") {
      throw new Error("Cannot change topic progress status from 'completed' to another status");
    }

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

  getByCourse: async (userId: string, courseId: string) => {
    // Get all topic progress records
    const topicProgressRecords = await db
      .select()
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId)
        )
      )
      .orderBy(courseTopicProgress.topicId, desc(courseTopicProgress.attemptNumber));

    // Get all quiz attempts for this user/course
    const allQuizAttempts = await db
      .select({
        topicId: vQuizAttemptsEnriched.topicId,
        scorePercentage: vQuizAttemptsEnriched.scorePercentage,
        attemptNumber: vQuizAttemptsEnriched.attemptNumber,
        isPassed: vQuizAttemptsEnriched.isPassed,
        completedAt: vQuizAttemptsEnriched.completedAt,
        startedAt: vQuizAttemptsEnriched.startedAt,
      })
      .from(vQuizAttemptsEnriched)
      .where(
        and(
          eq(vQuizAttemptsEnriched.userId, userId),
          eq(vQuizAttemptsEnriched.courseId, courseId)
        )
      );

    // Create a map of topicId -> best quiz attempt
    // Prefer passed attempts, then latest by completedAt/startedAt
    const quizAttemptsMap = new Map<string, {
      scorePercentage: number | null;
      attemptNumber: number;
    }>();

    // Group by topicId and find the best attempt for each
    const attemptsByTopic = new Map<string, typeof allQuizAttempts>();
    for (const attempt of allQuizAttempts) {
      if (!attemptsByTopic.has(attempt.topicId)) {
        attemptsByTopic.set(attempt.topicId, []);
      }
      attemptsByTopic.get(attempt.topicId)!.push(attempt);
    }

    // For each topic, find the best attempt (prefer passed, then latest)
    for (const [topicId, attempts] of attemptsByTopic.entries()) {
      // Sort: passed first, then by completedAt desc, then startedAt desc
      attempts.sort((a, b) => {
        // Prefer passed attempts
        if (a.isPassed && !b.isPassed) return -1;
        if (!a.isPassed && b.isPassed) return 1;
        
        // Then by completedAt (most recent first)
        if (a.completedAt && b.completedAt) {
          const aTime = new Date(a.completedAt).getTime();
          const bTime = new Date(b.completedAt).getTime();
          if (aTime !== bTime) return bTime - aTime;
        } else if (a.completedAt) return -1;
        else if (b.completedAt) return 1;
        
        // Finally by startedAt (most recent first)
        if (a.startedAt && b.startedAt) {
          const aTime = new Date(a.startedAt).getTime();
          const bTime = new Date(b.startedAt).getTime();
          return bTime - aTime;
        }
        
        return 0;
      });

      const bestAttempt = attempts[0];
      if (bestAttempt) {
        quizAttemptsMap.set(topicId, {
          scorePercentage: bestAttempt.scorePercentage,
          attemptNumber: bestAttempt.attemptNumber,
        });
      }
    }

    // Combine topic progress with quiz attempts
    // Preserve topic progress attemptNumber for grouping, add quiz attempt data
    return topicProgressRecords.map((progress) => {
      const quizAttempt = quizAttemptsMap.get(progress.topicId);
      return {
        ...progress,
        // Add quiz attempt data
        scorePercentage: quizAttempt?.scorePercentage ?? null,
        // Preserve topic progress attemptNumber, but also include quiz attemptNumber
        // The API route will use topicProgressAttemptNumber for grouping
        topicProgressAttemptNumber: progress.attemptNumber,
        quizAttemptNumber: quizAttempt?.attemptNumber ?? null,
        // For backward compatibility, attemptNumber will be quiz attempt number if available
        attemptNumber: quizAttempt?.attemptNumber ?? progress.attemptNumber,
      };
    });
  },

  getById: (attemptId: string) =>
    db
      .select()
      .from(courseTopicProgress)
      .where(eq(courseTopicProgress.id, attemptId))
      .limit(1),
};
