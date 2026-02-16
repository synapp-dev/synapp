import { z } from "zod";

// Schema for creating a topic
export const createTopicSchema = z.object({
  stageId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
});

export type CreateTopicParams = z.infer<typeof createTopicSchema>;

// Schema for updating a topic
export const updateTopicSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export type UpdateTopicParams = z.infer<typeof updateTopicSchema>;

// Schema for listing topics
export const listTopicsSchema = z.object({
  stageId: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
  search: z.string().trim().max(100).optional(),
  useView: z.string().optional().transform((val) => val === "true"),
  includeSlides: z.string().optional().transform((val) => val === "true"),
  includeUrls: z.string().optional().transform((val) => val === "true"),
});

export type ListTopicsParams = z.infer<typeof listTopicsSchema>;

// Schema for getting topic by ID
export const getTopicByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
  includeSlides: z.string().optional().transform((val) => val === "true"),
  includeUrls: z.string().optional().transform((val) => val === "true"),
});

export type GetTopicByIdParams = z.infer<typeof getTopicByIdSchema>;

// Schema for creating a slide
export const createSlideSchema = z.object({
  topicId: z.string().trim().min(1).max(500),
  position: z.string().trim().min(1).max(100),
  kind: z.enum(["text", "image", "video"]).default("image"),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  videoUrl: z.union([z.string().url(), z.null()]).optional(),
  textHtml: z.union([z.string(), z.null()]).optional().default(""),
  videoStartS: z.union([z.number(), z.null()]).optional(),
  videoEndS: z.union([z.number(), z.null()]).optional(),
});

export type CreateSlideParams = z.infer<typeof createSlideSchema>;

// Schema for creating a slide with position (topic-scoped API)
export const createSlideWithPositionSchema = z.object({
  kind: z.enum(["text", "image", "video"]).default("image"),
  afterSlideId: z.string().trim().min(1).max(500).optional().nullable(),
  position: z.string().trim().max(100).optional().nullable(),
  imageUrl: z.union([z.string(), z.null()]).optional(),
  videoUrl: z.union([z.string().url(), z.null()]).optional(),
  textHtml: z.union([z.string(), z.null()]).optional().default(""),
  videoStartS: z.union([z.number(), z.null()]).optional(),
  videoEndS: z.union([z.number(), z.null()]).optional(),
});

export type CreateSlideWithPositionParams = z.infer<
  typeof createSlideWithPositionSchema
>;

// Schema for bulk deleting slides
export const deleteSlidesSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(500)).min(1),
});

export type DeleteSlidesParams = z.infer<typeof deleteSlidesSchema>;

// Schema for updating a slide
export const updateSlideSchema = z.object({
  kind: z.enum(["text", "image", "video"]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  videoUrl: z.union([z.string().url(), z.null()]).optional(),
  textHtml: z.union([z.string(), z.null()]).optional(),
  videoStartS: z.union([z.number(), z.null()]).optional(),
  videoEndS: z.union([z.number(), z.null()]).optional(),
  position: z.string().trim().max(100).optional(),
});

export type UpdateSlideParams = z.infer<typeof updateSlideSchema>;

// Schema for reordering slides
export const reorderSlidesSchema = z.object({
  topicId: z.string().trim().min(1).max(500),
  slideIds: z.array(z.string().trim().min(1).max(500)).min(1),
});

export type ReorderSlidesParams = z.infer<typeof reorderSlidesSchema>;

// Schema for reordering topics
export const reorderTopicsSchema = z.object({
  stageId: z.string().trim().min(1).max(500),
  topicIds: z.array(z.string().trim().min(1).max(500)).min(1),
});

export type ReorderTopicsParams = z.infer<typeof reorderTopicsSchema>;