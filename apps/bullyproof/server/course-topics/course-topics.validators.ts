import { z } from "zod";

// Schema for getting course topics by course code
export const getTopicsByCourseCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
  includeSlides: z.string().optional().transform((val) => val === "true"),
  includeUrls: z.string().optional().transform((val) => val === "true"),
});

export type GetTopicsByCourseCodeParams = z.infer<
  typeof getTopicsByCourseCodeSchema
>;

// Schema for getting topics by course ID
export const getTopicsByCourseIdSchema = z.object({
  courseId: z.string().trim().min(1).max(500),
});

export type GetTopicsByCourseIdParams = z.infer<typeof getTopicsByCourseIdSchema>;

// Schema for creating a course topic
export const createTopicSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(1).max(500).optional().nullable(),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
  courseOrder: z.coerce.number().int().min(0).max(32767).optional().nullable(),
  isSequential: z.boolean().optional(),
  quizCompletionPercentage: z.coerce.number().int().min(0).max(100).optional(),
});

export type CreateTopicParams = z.infer<typeof createTopicSchema>;

// Schema for updating a course topic
export const updateTopicSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(1).max(500).optional().nullable(),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  courseOrder: z.coerce.number().int().min(0).max(32767).optional().nullable(),
  isSequential: z.boolean().optional(),
  quizCompletionPercentage: z.coerce.number().int().min(0).max(100).optional(),
});

export type UpdateTopicParams = z.infer<typeof updateTopicSchema>;

// Schema for deleting a course topic
export const deleteTopicSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteTopicParams = z.infer<typeof deleteTopicSchema>;

// Schema for reordering course topics
export const reorderTopicsSchema = z.object({
  courseId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).min(1),
});

export type ReorderTopicsParams = z.infer<typeof reorderTopicsSchema>;

// Schema for getting topic by slug
export const getTopicBySlugSchema = z.object({
  courseCode: z.string().trim().min(1).max(50),
  slug: z.string().trim().min(1).max(500),
  includeSlides: z.string().optional().transform((val) => val === "true"),
  includeUrls: z.string().optional().transform((val) => val === "true"),
});

export type GetTopicBySlugParams = z.infer<typeof getTopicBySlugSchema>;
