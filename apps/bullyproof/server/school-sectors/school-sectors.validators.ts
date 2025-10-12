import { z } from "zod";

// Schema for getting school sectors
export const getSchoolSectorsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

export type GetSchoolSectorsParams = z.infer<typeof getSchoolSectorsSchema>;

// Schema for getting school sector by ID
export const getSchoolSectorByIdSchema = z.object({
  id: z.string().trim().min(1).max(500),
});

export type GetSchoolSectorByIdParams = z.infer<typeof getSchoolSectorByIdSchema>;

// Schema for getting school sector by key
export const getSchoolSectorByKeySchema = z.object({
  key: z.string().trim().min(1).max(50),
});

export type GetSchoolSectorByKeyParams = z.infer<typeof getSchoolSectorByKeySchema>;
