import { z } from "zod";

// Query params for listing schools
export const listSchoolsQuerySchema = z
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
  })
  .transform((v) => ({
    limit: v.limit ?? 50,
    offset: v.offset ?? 0,
    search: v.search,
  }));

export type ListSchoolsQuery = z.infer<typeof listSchoolsQuerySchema>;
