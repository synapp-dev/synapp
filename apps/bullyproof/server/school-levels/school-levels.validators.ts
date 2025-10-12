import { z } from "zod";

// Schema for getting school levels
export const getSchoolLevelsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetSchoolLevelsParams = z.infer<typeof getSchoolLevelsSchema>;

// Schema for getting school level by ID
export const getSchoolLevelByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetSchoolLevelByIdParams = z.infer<typeof getSchoolLevelByIdSchema>;

// Schema for getting school level by key
export const getSchoolLevelByKeySchema = z.object({
  key: z.string().trim().min(1).max(50),
});

export type GetSchoolLevelByKeyParams = z.infer<typeof getSchoolLevelByKeySchema>;
