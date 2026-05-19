import { z } from "zod";

export const userLookupQuerySchema = z.object({
  email: z.string().email(),
  schoolId: z.string().uuid().optional(),
});

export type UserLookupQuery = z.infer<typeof userLookupQuerySchema>;

export type UserLookupResponse = {
  exists: boolean;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  schoolRoleKeys?: string[];
};
