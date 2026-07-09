import {
  createFeedbackSchema,
  updateFeedbackSchema,
  getFeedbackByLessonIdSchema,
  type CreateFeedbackParams,
  type UpdateFeedbackParams,
} from "./lesson-feedback.validators";
import { lessonFeedbackRepo } from "./lesson-feedback.repo";
import { lessonsRepo } from "../lessons/lessons.repo";
import { lessonsService } from "../lessons/lessons.service";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageFeedback(
  ctx: AuthContext,
  lessonId: string,
  _teacherUserId?: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // Only the owner at feedback time can submit feedback (feedbackOwnerUserId or createdByUserId)
  const lessonData = await lessonsRepo.getById(lessonId);
  if (!lessonData[0]) {
    throw new Error("Lesson not found");
  }
  const lesson = lessonData[0];
  const meta = (lesson.metadata as Record<string, unknown>) || {};
  const feedbackOwnerId = (meta.feedbackOwnerUserId as string) ?? lesson.createdByUserId;
  if (feedbackOwnerId !== ctx.userId) {
    throw new Error("Unauthorized to manage feedback for this lesson");
  }
}

export const lessonFeedbackService = {
  async getFeedbackByLessonId(ctx: AuthContext, params: unknown) {
    const { lessonId } = getFeedbackByLessonIdSchema.parse(params);

    // Check if user can view the lesson
    const lessonData = await lessonsRepo.getById(lessonId);
    if (!lessonData[0]) {
      return null;
    }

    const lesson = lessonData[0];
    const meta = (lesson.metadata as Record<string, unknown>) || {};
    const feedbackOwnerId = (meta.feedbackOwnerUserId as string) ?? lesson.createdByUserId;
    if (feedbackOwnerId !== ctx.userId) {
      throw new Error("Unauthorized to view feedback for this lesson");
    }

    const feedback = await lessonFeedbackRepo.getByLessonId(lessonId);
    return feedback[0] || null;
  },

  async createFeedback(ctx: AuthContext, params: unknown) {
    const data: CreateFeedbackParams = createFeedbackSchema.parse(params);
    await assertCanManageFeedback(ctx, data.lessonId);

    // Check if feedback already exists
    const existingFeedback = await lessonFeedbackRepo.getByLessonId(data.lessonId);
    if (existingFeedback[0]) {
      throw new Error("Feedback already exists for this lesson");
    }

    const feedback = await lessonFeedbackRepo.create({
      lessonId: data.lessonId,
      teacherUserId: ctx.userId!,
      rating: data.rating,
      comments: data.comments ?? null,
    });

    // Update lesson status to completed (via service so eventHistory is logged)
    await lessonsService.updateLesson(ctx, data.lessonId, { status: "completed" });

    return feedback;
  },

  async updateFeedback(ctx: AuthContext, lessonId: string, params: unknown) {
    const data: UpdateFeedbackParams = updateFeedbackSchema.parse(params);
    await assertCanManageFeedback(ctx, lessonId);

    const existingFeedback = await lessonFeedbackRepo.getByLessonId(lessonId);
    if (!existingFeedback[0]) {
      throw new Error("Feedback not found");
    }

    const updated = await lessonFeedbackRepo.updateByLessonId(lessonId, {
      rating: data.rating,
      comments: data.comments ?? null,
    });

    // Ensure lesson status is completed after feedback update (via service so eventHistory is logged)
    await lessonsService.updateLesson(ctx, lessonId, { status: "completed" });

    return updated;
  },
};

