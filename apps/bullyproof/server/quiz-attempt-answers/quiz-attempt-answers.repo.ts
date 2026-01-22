import { db } from "@/server/db/drizzle";
import { quizAttemptAnswers, quizAnswers } from "@/server/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export const quizAttemptAnswersRepo = {
  getByAttempt: (attemptId: string) =>
    db
      .select()
      .from(quizAttemptAnswers)
      .where(eq(quizAttemptAnswers.attemptId, attemptId))
      .orderBy(quizAttemptAnswers.questionId, quizAttemptAnswers.answeredAt),

  getByQuestion: (attemptId: string, questionId: string) =>
    db
      .select()
      .from(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, attemptId),
          eq(quizAttemptAnswers.questionId, questionId)
        )
      ),

  submitAnswer: async (data: {
    attemptId: string;
    questionId: string;
    answerIds: string[]; // Array of answer IDs (supports single and multiple choice)
    timeTakenSeconds?: number;
  }) => {
    if (!data.answerIds || data.answerIds.length === 0) {
      throw new Error("At least one answer ID is required");
    }

    // Validate all answer IDs exist
    const answers = await db
      .select({ id: quizAnswers.id, isCorrect: quizAnswers.isCorrect })
      .from(quizAnswers)
      .where(inArray(quizAnswers.id, data.answerIds));

    if (answers.length !== data.answerIds.length) {
      throw new Error("One or more answer IDs not found");
    }

    // Calculate isCorrect: question is correct if all selected answers are correct AND no incorrect answers are selected
    // Note: This is a simplified check. Full correctness is calculated during quiz submission.
    const allCorrect = answers.every((a) => a.isCorrect);
    const hasIncorrect = answers.some((a) => !a.isCorrect);
    const isCorrect = allCorrect && !hasIncorrect ? true : null; // null means we'll calculate during submission

    const answerIdsJson = JSON.stringify(data.answerIds);
    const firstAnswerId = data.answerIds[0] || null;

    // Get existing answer record for this question (if any)
    const existing = await db
      .select()
      .from(quizAttemptAnswers)
      .where(
        and(
          eq(quizAttemptAnswers.attemptId, data.attemptId),
          eq(quizAttemptAnswers.questionId, data.questionId)
        )
      )
      .limit(1);

    // Build metadata to track changes
    let metadata: any = {};
    if (existing.length > 0) {
      // Get old answer IDs - handle both old format (answerId) and new format (answerIds)
      let oldAnswerIds: string[] = [];
      if (existing[0].answerIds) {
        // New format: answerIds JSONB array
        oldAnswerIds = Array.isArray(existing[0].answerIds) 
          ? existing[0].answerIds 
          : JSON.parse(existing[0].answerIds as any);
      } else if (existing[0].answerId) {
        // Old format: single answerId (backward compatibility)
        oldAnswerIds = [existing[0].answerId];
      }
      
      const newAnswerIds = data.answerIds;
      
      // Check if answers actually changed (compare as sets to ignore order)
      const oldSet = new Set(oldAnswerIds.sort());
      const newSet = new Set(newAnswerIds.sort());
      const changed = oldAnswerIds.length !== newAnswerIds.length || 
                     !oldAnswerIds.every((id: string) => newSet.has(id)) ||
                     !newAnswerIds.every((id: string) => oldSet.has(id));
      
      // Get existing metadata
      const existingMetadata = existing[0].metadata 
        ? (typeof existing[0].metadata === 'string' 
            ? JSON.parse(existing[0].metadata as any) 
            : existing[0].metadata)
        : {};
      
      if (changed) {
        // Track the change in history
        const changeHistory = existingMetadata.changeHistory || [];
        changeHistory.push({
          from: oldAnswerIds.length === 1 ? oldAnswerIds[0] : oldAnswerIds,
          to: newAnswerIds.length === 1 ? newAnswerIds[0] : newAnswerIds,
          timestamp: new Date().toISOString(),
        });
        
        metadata = {
          ...existingMetadata,
          changeHistory,
        };
      } else {
        // No change, keep existing metadata as-is
        metadata = existingMetadata;
      }

      // Update existing record
      const metadataJson = metadata && Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
      return db
        .update(quizAttemptAnswers)
        .set({
          answerId: firstAnswerId,
          answerIds: answerIdsJson as any,
          metadata: metadataJson as any,
          isCorrect,
          timeTakenSeconds: data.timeTakenSeconds ?? null,
          updatedAt: sql`now()`,
        })
        .where(eq(quizAttemptAnswers.id, existing[0].id))
        .returning();
    } else {
      // Insert new record
      return db
        .insert(quizAttemptAnswers)
        .values({
          attemptId: data.attemptId,
          questionId: data.questionId,
          answerId: firstAnswerId,
          answerIds: answerIdsJson as any,
          metadata: null,
          isCorrect,
          timeTakenSeconds: data.timeTakenSeconds ?? null,
        })
        .returning();
    }
  },
};
