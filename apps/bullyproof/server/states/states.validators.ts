import { z } from "zod";

// Schema for getting states
export const getStatesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetStatesParams = z.infer<typeof getStatesSchema>;

// Schema for getting state by ID
export const getStateByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetStateByIdParams = z.infer<typeof getStateByIdSchema>;

// Schema for getting state by code
export const getStateByCodeSchema = z.object({
  code: z.string().trim().min(1).max(10),
});

export type GetStateByCodeParams = z.infer<typeof getStateByCodeSchema>;
