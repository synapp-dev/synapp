import { z } from "zod";

// Schema for creating a topic
export const createTopicSchema = z.object({
  stageId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  officialNotes: z.string().trim().max(5000).optional(),
});

export type CreateTopicParams = z.infer<typeof createTopicSchema>;

// Schema for updating a topic
export const updateTopicSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  officialNotes: z.string().trim().max(5000).optional(),
});

export type UpdateTopicParams = z.infer<typeof updateTopicSchema>;

// Schema for listing topics
export const listTopicsSchema = z.object({
  stageId: z.string().trim().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
  search: z.string().trim().max(100).optional(),
});

export type ListTopicsParams = z.infer<typeof listTopicsSchema>;

// Schema for getting topic by ID
export const getTopicByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetTopicByIdParams = z.infer<typeof getTopicByIdSchema>;
