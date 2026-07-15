import { z } from "zod";

// Schema for getting certification courses
export const getCoursesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export type GetCoursesParams = z.infer<typeof getCoursesSchema>;

// Schema for getting course by ID
export const getCourseByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetCourseByIdParams = z.infer<typeof getCourseByIdSchema>;

// Schema for getting course by code
export const getCourseByCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
});

export type GetCourseByCodeParams = z.infer<typeof getCourseByCodeSchema>;

// Schema for getting course by slug
export const getCourseBySlugSchema = z.object({
  slug: z.string().trim().min(1).max(500),
});

export type GetCourseBySlugParams = z.infer<typeof getCourseBySlugSchema>;

// Schema for creating a certification course
export const createCourseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50),
  name: z.string().trim().min(1).max(500),
  sortIndex: z.coerce.number().int().min(0).max(32767).optional(),
  certificateType: z
    .enum(["none", "completion", "achievement", "custom"])
    .nullable()
    .optional(),
});

export type CreateCourseParams = z.infer<typeof createCourseSchema>;

// Schema for question definition validation
const questionDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "rating", "multiple_choice"]),
  label: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

// Schema for updating a certification course
export const updateCourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(500).optional(),
  sortIndex: z.coerce.number().int().min(0).max(32767).optional(),
  certificateType: z
    .enum(["none", "completion", "achievement", "custom"])
    .nullable()
    .optional(),
  ratingQuestions: z.array(questionDefinitionSchema).optional().nullable(),
});

export type UpdateCourseParams = z.infer<typeof updateCourseSchema>;

// Schema for deleting a certification course
export const deleteCourseSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteCourseParams = z.infer<typeof deleteCourseSchema>;
