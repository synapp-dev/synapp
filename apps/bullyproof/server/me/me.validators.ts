import { z } from "zod";

// Schema for getting user profile by ID
export const getUserByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>;

// Schema for getting user profile by email
export const getUserByEmailSchema = z.object({
  email: z.string().trim().min(1).max(320),
});

export type GetUserByEmailParams = z.infer<typeof getUserByEmailSchema>;

// Schema for updating user profile
export const updateUserProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().trim().min(1).max(500).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateUserProfileParams = z.infer<typeof updateUserProfileSchema>;

// Schema for getting schools by user ID (only limit parameter)
export const getSchoolsByUserIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

export type GetSchoolsByUserIdParams = z.infer<typeof getSchoolsByUserIdSchema>;
