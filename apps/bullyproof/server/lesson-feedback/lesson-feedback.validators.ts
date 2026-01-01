import { z } from "zod";

// Schema for creating feedback
export const createFeedbackSchema = z.object({
  lessonId: z.string().trim().min(1).max(500),
  rating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(5000).optional(),
});

export type CreateFeedbackParams = z.infer<typeof createFeedbackSchema>;

// Schema for updating feedback
export const updateFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().trim().max(5000).optional(),
});

export type UpdateFeedbackParams = z.infer<typeof updateFeedbackSchema>;

// Schema for getting feedback by lesson ID
export const getFeedbackByLessonIdSchema = z.object({
  lessonId: z.string().trim().min(1).max(500),
});

export type GetFeedbackByLessonIdParams = z.infer<typeof getFeedbackByLessonIdSchema>;

