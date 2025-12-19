import { z } from "zod";

// Schema for getting certification topics by stage code
export const getTopicsByStageCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
});

export type GetTopicsByStageCodeParams = z.infer<
  typeof getTopicsByStageCodeSchema
>;

// Schema for getting topics by stage ID
export const getTopicsByStageIdSchema = z.object({
  stageId: z.string().trim().min(1).max(500),
});

export type GetTopicsByStageIdParams = z.infer<typeof getTopicsByStageIdSchema>;
