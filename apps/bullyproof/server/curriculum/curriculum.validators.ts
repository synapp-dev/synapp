import { z } from "zod";

// Schema for getting curriculum stages
export const getStagesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetStagesParams = z.infer<typeof getStagesSchema>;

// Schema for getting school years
export const getYearsSchema = z.object({
  levelId: z.string().trim().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetYearsParams = z.infer<typeof getYearsSchema>;

// Schema for getting stage by ID
export const getStageByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetStageByIdParams = z.infer<typeof getStageByIdSchema>;

// Schema for getting year by ID
export const getYearByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetYearByIdParams = z.infer<typeof getYearByIdSchema>;

// Schema for getting levels
export const getLevelsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetLevelsParams = z.infer<typeof getLevelsSchema>;
