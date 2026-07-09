import { z } from "zod";

// Schema for getting curriculum stages
export const getStagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
  /** Scope stages to a content type; omitted resolves to the Default type. */
  contentTypeId: z.string().uuid().optional(),
});

export type GetStagesParams = z.infer<typeof getStagesSchema>;

// Schema for getting school years
export const getYearsSchema = z.object({
  levelId: z.string().trim().min(1).max(500).optional(),
  levelIds: z
    .string()
    .trim()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").filter((id) => id.trim().length > 0);
    }),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export type GetYearsParams = z.infer<typeof getYearsSchema>;

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

// Schema for getting stage by slug
export const getStageBySlugSchema = z.object({
  slug: z.string().trim().min(1).max(500),
});

export type GetStageBySlugParams = z.infer<typeof getStageBySlugSchema>;

// Schema for getting year by ID
export const getYearByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetYearByIdParams = z.infer<typeof getYearByIdSchema>;

// Schema for getting levels
export const getLevelsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export type GetLevelsParams = z.infer<typeof getLevelsSchema>;

// Schema for creating a curriculum stage
export const createStageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^S[0-9]+$/, "Code must match pattern S[0-9]+ (e.g., S1, S2)"),
  name: z.string().trim().min(1).max(500),
  minimumYearLevelIds: z
    .array(z.string().uuid())
    .min(1, "At least one year level must be selected"),
});

export type CreateStageParams = z.infer<typeof createStageSchema>;

// Schema for updating a curriculum stage
export const updateStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(500),
  minimumYearLevelIds: z
    .array(z.string().uuid())
    .min(1, "At least one year level must be selected"),
});

export type UpdateStageParams = z.infer<typeof updateStageSchema>;

// Schema for deleting a curriculum stage
export const deleteStageSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteStageParams = z.infer<typeof deleteStageSchema>;
