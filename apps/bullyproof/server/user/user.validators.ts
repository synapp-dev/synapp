import { z } from "zod";

// Schema for listing users with pagination and filters
export const listUsersSchema = z
  .object({
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
    role: z.string().trim().max(100).optional(),
    schoolId: z.string().trim().max(200).optional(), // Accept UUID or slug
    sortBy: z.enum(["name", "createdAt", "lastActive"]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  })
  .transform((v) => ({
    limit: v.limit ?? 50,
    offset: v.offset ?? 0,
    search: v.search,
    role: v.role,
    schoolId: v.schoolId,
    sortBy: v.sortBy,
    sortDir: v.sortDir,
  }));

export type ListUsersParams = z.infer<typeof listUsersSchema>;

// Schema for creating a user with magic link
export const createUserWithMagicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type CreateUserWithMagicLinkParams = z.infer<typeof createUserWithMagicLinkSchema>;





