import { z } from "zod";

// Schema for getting certification topics by stage code
export const getTopicsByStageCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
  includeSlides: z.string().optional().transform((val) => val === "true"),
  includeUrls: z.string().optional().transform((val) => val === "true"),
});

export type GetTopicsByStageCodeParams = z.infer<
  typeof getTopicsByStageCodeSchema
>;

// Schema for getting topics by stage ID
export const getTopicsByStageIdSchema = z.object({
  stageId: z.string().trim().min(1).max(500),
});

export type GetTopicsByStageIdParams = z.infer<typeof getTopicsByStageIdSchema>;

// Schema for creating a certification topic
export const createTopicSchema = z.object({
  stageId: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
  stageOrder: z.coerce.number().int().min(0).max(32767).optional().nullable(),
});

export type CreateTopicParams = z.infer<typeof createTopicSchema>;

// Schema for updating a certification topic
export const updateTopicSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  officialNotes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  stageOrder: z.coerce.number().int().min(0).max(32767).optional().nullable(),
});

export type UpdateTopicParams = z.infer<typeof updateTopicSchema>;

// Schema for deleting a certification topic
export const deleteTopicSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteTopicParams = z.infer<typeof deleteTopicSchema>;

// Schema for reordering certification topics
export const reorderTopicsSchema = z.object({
  stageId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).min(1),
});

export type ReorderTopicsParams = z.infer<typeof reorderTopicsSchema>;
