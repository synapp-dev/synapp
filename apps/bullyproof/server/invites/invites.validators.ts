import { z } from "zod";

// Schema for creating an invite
export const createInviteSchema = z.object({
  schoolId: z.string().trim().min(1).max(500),
  email: z.string().email().max(320),
  roleKey: z.string().trim().min(1).max(50),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateInviteParams = z.infer<typeof createInviteSchema>;

// Schema for updating an invite
export const updateInviteSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"]).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateInviteParams = z.infer<typeof updateInviteSchema>;

// Schema for listing invites
export const listInvitesSchema = z.object({
  schoolId: z.string().trim().min(1).max(500).optional(),
  email: z.string().email().max(320).optional(),
  status: z.enum(["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type ListInvitesParams = z.infer<typeof listInvitesSchema>;

// Schema for getting invite by ID
export const getInviteByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetInviteByIdParams = z.infer<typeof getInviteByIdSchema>;

// Schema for accepting an invite
export const acceptInviteSchema = z.object({
  id: z.string().trim().min(1).max(500),
  userId: z.string().trim().min(1).max(500),
});

export type AcceptInviteParams = z.infer<typeof acceptInviteSchema>;
