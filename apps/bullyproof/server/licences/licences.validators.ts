import { z } from "zod";

// Schema for creating a licence
export const createLicenceSchema = z.object({
  schoolId: z.string().trim().min(1).max(500),
  status: z.enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxUsers: z.number().int().min(1).max(10000).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateLicenceParams = z.infer<typeof createLicenceSchema>;

// Schema for updating a licence
export const updateLicenceSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxUsers: z.number().int().min(1).max(10000).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateLicenceParams = z.infer<typeof updateLicenceSchema>;

// Schema for listing licences
export const listLicencesSchema = z.object({
  schoolId: z.string().trim().min(1).max(500).optional(),
  status: z.enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type ListLicencesParams = z.infer<typeof listLicencesSchema>;

// Schema for getting licence by ID
export const getLicenceByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetLicenceByIdParams = z.infer<typeof getLicenceByIdSchema>;
