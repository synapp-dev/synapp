import { z } from "zod";

// Schema for creating a lesson
export const createLessonSchema = z.object({
  schoolId: z.string().trim().min(1).max(500),
  topicId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  scheduledFor: z.string().datetime().optional(),
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
export const listLessonsSchema = z.object({
  teacherId: z.string().trim().min(1).max(500).optional(),
  classId: z.string().trim().min(1).max(500).optional(),
  topicId: z.string().trim().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
  search: z.string().trim().max(100).optional(),
});

export type ListLessonsParams = z.infer<typeof listLessonsSchema>;

// Schema for getting lesson by ID
export const getLessonByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetLessonByIdParams = z.infer<typeof getLessonByIdSchema>;
