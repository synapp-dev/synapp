import { z } from "zod";

// Schema for creating a class
export const createClassSchema = z.object({
  schoolId: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(50).optional(),
  stream: z.string().trim().max(100).optional(),
  room: z.string().trim().max(100).optional(),
  studentCap: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional().default(true),
  yearIds: z.array(z.string().trim().min(1)).optional(),
});

export type CreateClassParams = z.infer<typeof createClassSchema>;

// Schema for updating a class
export const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(50).optional(),
  stream: z.string().trim().max(100).optional(),
  room: z.string().trim().max(100).optional(),
  studentCap: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional(),
  yearIds: z.array(z.string().trim().min(1)).optional(),
});

export type UpdateClassParams = z.infer<typeof updateClassSchema>;

// Schema for listing classes
export const listClassesSchema = z.object({
  schoolId: z.string().trim().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
  search: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
});

export type ListClassesParams = z.infer<typeof listClassesSchema>;

// Schema for getting class by ID
export const getClassByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetClassByIdParams = z.infer<typeof getClassByIdSchema>;
