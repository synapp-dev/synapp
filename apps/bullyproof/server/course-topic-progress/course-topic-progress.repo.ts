import { db } from "@/server/db/drizzle";
import { courseTopicProgress, courseTopicSlides, vQuizAttemptsEnriched } from "@/server/db/schema";
import { eq, and, desc, max, sql } from "drizzle-orm";

export const courseTopicProgressRepo = {
  // Get progress for a user/topic
  getProgress: async (
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

  // Alias for backward compatibility
  getLatestAttempt: async (
    userId: string,
    courseId: string,
    topicId: string
  ) => {
    return courseTopicProgressRepo.getProgress(userId, courseId, topicId);
  },

  // Get in-progress record
  getInProgress: async (
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

  // Alias for backward compatibility
  getInProgressAttempt: async (
    userId: string,
    courseId: string,
    topicId: string
  ) => {
    return courseTopicProgressRepo.getInProgress(userId, courseId, topicId);
  },

  // Get or create progress
  getOrCreateProgress: async (
    userId: string,
    courseId: string,
    topicId: string,
    currentSlideId?: string
  ) => {
    // First, check if progress already exists
    const existing = await courseTopicProgressRepo.getProgress(
      userId,
      courseId,
      topicId
    );

    if (existing) {
      return existing;
    }

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
      // Create new progress
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
      // Check for PostgreSQL unique constraint violation (error code 23505)
      // The error might be in error.code or error.cause.code (for nested PostgresError)
      const errorCode = error?.code || error?.cause?.code;
      const errorMessage = error?.message || error?.cause?.message || String(error || "");
      const isDuplicateKeyError = 
        errorCode === "23505" || 
        errorCode === 23505 ||
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("course_topic_progress_user_course_topic_unique");

      if (isDuplicateKeyError) {
        // Another request created it - fetch and return the existing progress
        const existingProgress = await courseTopicProgressRepo.getProgress(
          userId,
          courseId,
          topicId
        );
        
        if (existingProgress) {
          return existingProgress;
        }
      }
      
      // Re-throw if it's not a duplicate key error or if we couldn't find the existing progress
      throw error;
    }
  },

  // Alias for backward compatibility
  createAttempt: async (
    userId: string,
    courseId: string,
    topicId: string,
    currentSlideId?: string
  ) => {
    return courseTopicProgressRepo.getOrCreateProgress(
      userId,
      courseId,
      topicId,
      currentSlideId
    );
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

  updateStatus: async (
    attemptId: string,
    status: "not_started" | "viewing_slides" | "quiz_unlocked" | "completed",
    options?: {
      slidesCompletedAt?: Date | string | null;
      quizUnlockedAt?: Date | string | null;
      completedAt?: Date | string | null;
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
      // Convert Date to ISO string if needed (schema expects string mode)
      updateData.slidesCompletedAt = options.slidesCompletedAt instanceof Date 
        ? options.slidesCompletedAt.toISOString() 
        : options.slidesCompletedAt;
    }
    if (options?.quizUnlockedAt !== undefined) {
      // Convert Date to ISO string if needed (schema expects string mode)
      updateData.quizUnlockedAt = options.quizUnlockedAt instanceof Date 
        ? options.quizUnlockedAt.toISOString() 
        : options.quizUnlockedAt;
    }
    if (options?.completedAt !== undefined) {
      // Convert Date to ISO string if needed (schema expects string mode)
      updateData.completedAt = options.completedAt instanceof Date 
        ? options.completedAt.toISOString() 
        : options.completedAt;
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
      .orderBy(courseTopicProgress.topicId);

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
    // Add quiz attempt data
    return topicProgressRecords.map((progress) => {
      const quizAttempt = quizAttemptsMap.get(progress.topicId);
      return {
        ...progress,
        // Add quiz attempt data
        scorePercentage: quizAttempt?.scorePercentage ?? null,
        quizAttemptNumber: quizAttempt?.attemptNumber ?? null,
        // For backward compatibility, attemptNumber will be quiz attempt number if available
        attemptNumber: quizAttempt?.attemptNumber ?? null,
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
