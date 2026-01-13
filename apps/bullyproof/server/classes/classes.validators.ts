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
  startYear: z.string().datetime().optional(),
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
  teacherIds: z.array(z.string().trim().min(1)).optional(),
  startYear: z.string().datetime().optional(),
});

export type UpdateClassParams = z.infer<typeof updateClassSchema>;

// Schema for listing classes
export const listClassesSchema = z
  .object({
    schoolId: z.string().trim().min(1).max(500).optional(),
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
      .refine(
        (v) => v == null || (Number.isInteger(v) && v >= 0 && v <= 10_000),
        {
          message: "offset must be an integer between 0 and 10000",
        }
      ),
    search: z.string().trim().max(100).optional(),
    active: z
      .string()
      .optional()
      .transform((v) => {
        if (v == null) return undefined;
        return v === "true";
      }),
  })
  .transform((v) => ({
    schoolId: v.schoolId,
    limit: v.limit ?? 50,
    offset: v.offset ?? 0,
    search: v.search,
    active: v.active,
  }));

export type ListClassesParams = z.infer<typeof listClassesSchema>;

// Schema for getting class by ID
export const getClassByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetClassByIdParams = z.infer<typeof getClassByIdSchema>;
