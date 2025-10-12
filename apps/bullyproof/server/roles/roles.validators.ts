import { z } from "zod";

// Schema for creating a role
export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  key: z.string().trim().min(1).max(50),
  description: z.string().trim().max(500).optional(),
  scope: z.enum(["platform", "school"]),
});

export type CreateRoleParams = z.infer<typeof createRoleSchema>;

// Schema for updating a role
export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  key: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(500).optional(),
});

export type UpdateRoleParams = z.infer<typeof updateRoleSchema>;

// Schema for assigning a role to a user
export const assignRoleSchema = z.object({
  userId: z.string().trim().min(1).max(500),
  roleId: z.string().trim().min(1).max(500),
  schoolId: z.string().trim().min(1).max(500).optional(),
});

export type AssignRoleParams = z.infer<typeof assignRoleSchema>;

// Schema for removing a role from a user
export const removeRoleSchema = z.object({
  userId: z.string().trim().min(1).max(500),
  roleId: z.string().trim().min(1).max(500),
  schoolId: z.string().trim().min(1).max(500).optional(),
});

export type RemoveRoleParams = z.infer<typeof removeRoleSchema>;

// Schema for listing roles
export const listRolesSchema = z.object({
  scope: z.enum(["platform", "school"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type ListRolesParams = z.infer<typeof listRolesSchema>;

// Schema for getting role by ID
export const getRoleByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetRoleByIdParams = z.infer<typeof getRoleByIdSchema>;

// Schema for getting user roles
export const getUserRolesSchema = z.object({
  userId: z.string().trim().min(1).max(500),
});

export type GetUserRolesParams = z.infer<typeof getUserRolesSchema>;
