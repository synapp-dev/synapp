import { db } from "@/server/db/drizzle";
import { certificationUserAnswers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const certificationAnswersRepo = {
  /**
   * Create a new answer record
   */
  createAnswer: (data: {
    userId: string;
    stageId: string;
    topicId: string;
    slideId: string;
    attemptId?: string;
    answerId?: string;
    isCorrect: boolean;
    timeTaken?: number;
  }) =>
    db
      .insert(certificationUserAnswers)
      .values({
        userId: data.userId,
        stageId: data.stageId,
        topicId: data.topicId,
        slideId: data.slideId,
        attemptId: data.attemptId ?? null,
        answerId: data.answerId ?? null,
        isCorrect: data.isCorrect,
        timeTaken: data.timeTaken ?? null,
      })
      .returning(),

  /**
   * Get answers for a specific attempt
   */
  getByAttempt: (attemptId: string) =>
    db
      .select()
      .from(certificationUserAnswers)
      .where(eq(certificationUserAnswers.attemptId, attemptId)),

  /**
   * Get answers for a user/topic/slide
   */
  getBySlide: (
    userId: string,
    stageId: string,
    topicId: string,
    slideId: string
  ) =>
    db
      .select()
      .from(certificationUserAnswers)
      .where(
        and(
          eq(certificationUserAnswers.userId, userId),
          eq(certificationUserAnswers.stageId, stageId),
          eq(certificationUserAnswers.topicId, topicId),
          eq(certificationUserAnswers.slideId, slideId)
        )
      )
      .orderBy(certificationUserAnswers.answeredAt),

  /**
   * Get all answers for a user/topic
   */
  getByTopic: (userId: string, stageId: string, topicId: string) =>
    db
      .select()
      .from(certificationUserAnswers)
      .where(
        and(
          eq(certificationUserAnswers.userId, userId),
          eq(certificationUserAnswers.stageId, stageId),
          eq(certificationUserAnswers.topicId, topicId)
        )
      )
      .orderBy(certificationUserAnswers.answeredAt),

  /**
   * Get answer for a specific attempt and slide
   */
  getByAttemptAndSlide: async (
    attemptId: string,
    slideId: string
  ) => {
    const result = await db
      .select()
      .from(certificationUserAnswers)
      .where(
        and(
          eq(certificationUserAnswers.attemptId, attemptId),
          eq(certificationUserAnswers.slideId, slideId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Upsert answer - update if exists for this attempt/slide, create if not
   */
  upsertAnswer: async (data: {
    userId: string;
    stageId: string;
    topicId: string;
    slideId: string;
    attemptId?: string;
    answerId?: string;
    isCorrect: boolean;
    timeTaken?: number;
  }) => {
    // If attemptId is provided, check for existing answer
    if (data.attemptId) {
      const existing = await certificationAnswersRepo.getByAttemptAndSlide(
        data.attemptId,
        data.slideId
      );

      if (existing) {
        // Update existing answer
        return db
          .update(certificationUserAnswers)
          .set({
            answerId: data.answerId ?? null,
            isCorrect: data.isCorrect,
            timeTaken: data.timeTaken ?? null,
            answeredAt: new Date().toISOString(),
          })
          .where(eq(certificationUserAnswers.id, existing.id))
          .returning();
      }
    }

    // Create new answer if no existing one found
    return db
      .insert(certificationUserAnswers)
      .values({
        userId: data.userId,
        stageId: data.stageId,
        topicId: data.topicId,
        slideId: data.slideId,
        attemptId: data.attemptId ?? null,
        answerId: data.answerId ?? null,
        isCorrect: data.isCorrect,
        timeTaken: data.timeTaken ?? null,
      })
      .returning();
  },
};

