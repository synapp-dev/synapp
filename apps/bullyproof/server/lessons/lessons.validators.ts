import { z } from "zod";

// Schema for creating a lesson
export const createLessonSchema = z.object({
  schoolId: z.string().trim().min(1).max(500),
  topicId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  scheduledFor: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  classIds: z.array(z.string().trim().min(1)).optional(),
});

export type CreateLessonParams = z.infer<typeof createLessonSchema>;

// Schema for updating a lesson
export const updateLessonSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  scheduledFor: z.string().datetime().optional(),
  classIds: z.array(z.string().trim().min(1)).optional(),
});

export type UpdateLessonParams = z.infer<typeof updateLessonSchema>;

// Schema for listing lessons
export const listLessonsSchema = z
  .object({
    teacherId: z.string().trim().min(1).max(500).optional(),
    classId: z.string().trim().min(1).max(500).optional(),
    topicId: z.string().trim().min(1).max(500).optional(),
    status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    limit: z
      .string()
      .optional()
      .transform((v) => (v == null ? undefined : Number(v)))
      .refine((v) => v == null || (Number.isInteger(v) && v > 0 && v <= 100), {
        message: "limit must be an integer between 1 and 100",
      }),
    offset: z
      .string()
      .optional()
      .transform((v) => (v == null ? undefined : Number(v)))
      .refine((v) => v == null || (Number.isInteger(v) && v >= 0 && v <= 10_000), {
        message: "offset must be an integer between 0 and 10000",
      }),
    search: z.string().trim().max(100).optional(),
  })
  .transform((v) => ({
    teacherId: v.teacherId,
    classId: v.classId,
    topicId: v.topicId,
    status: v.status,
    limit: v.limit ?? 50,
    offset: v.offset ?? 0,
    search: v.search,
  }));

export type ListLessonsParams = z.infer<typeof listLessonsSchema>;

// Schema for getting lesson by ID
export const getLessonByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetLessonByIdParams = z.infer<typeof getLessonByIdSchema>;
