import {
  createFeedbackSchema,
  updateFeedbackSchema,
  getFeedbackByLessonIdSchema,
  type CreateFeedbackParams,
  type UpdateFeedbackParams,
  type GetFeedbackByLessonIdParams,
} from "./lesson-feedback.validators";
import { lessonFeedbackRepo } from "./lesson-feedback.repo";
import { lessonsRepo } from "../lessons/lessons.repo";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageFeedback(
  ctx: AuthContext,
  lessonId: string,
  teacherUserId?: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // Only the teacher who created the lesson can submit feedback
  const lessonData = await lessonsRepo.getById(lessonId);
  if (!lessonData[0]) {
    throw new Error("Lesson not found");
  }

  // Check if the user is the creator of the lesson
  if (lessonData[0].createdByUserId !== ctx.userId) {
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

    // Allow the lesson creator to view feedback
    if (lessonData[0].createdByUserId !== ctx.userId) {
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

    // Update lesson status to completed
    await lessonsRepo.update(data.lessonId, { status: "completed" });

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

    // Ensure lesson status is completed after feedback update
    await lessonsRepo.update(lessonId, { status: "completed" });

    return updated;
  },
};

