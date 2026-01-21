import { z } from "zod";

// Schema for getting certification stages
export const getStagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export type GetStagesParams = z.infer<typeof getStagesSchema>;

// Schema for getting stage by ID
export const getStageByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetStageByIdParams = z.infer<typeof getStageByIdSchema>;

// Schema for getting stage by code
export const getStageByCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
});

export type GetStageByCodeParams = z.infer<typeof getStageByCodeSchema>;

// Schema for creating a certification stage
export const createStageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50),
  name: z.string().trim().min(1).max(500),
  sortIndex: z.coerce.number().int().min(0).max(32767).optional(),
});

export type CreateStageParams = z.infer<typeof createStageSchema>;

// Schema for updating a certification stage
export const updateStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(500).optional(),
  sortIndex: z.coerce.number().int().min(0).max(32767).optional(),
});

export type UpdateStageParams = z.infer<typeof updateStageSchema>;

// Schema for deleting a certification stage
export const deleteStageSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteStageParams = z.infer<typeof deleteStageSchema>;
