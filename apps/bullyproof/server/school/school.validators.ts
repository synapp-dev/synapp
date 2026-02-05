import { z } from "zod";
import { capitalizeSchoolName } from "@/utils/school-name";

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

// Schema for creating a school
export const createSchoolSchema = z
  .object({
    name: z
      .string()
      .min(1, "School name is required")
      .max(255)
      .transform((val) => capitalizeSchoolName(val.trim())),
    stateId: z.string().uuid("Invalid state ID"),
    sectorId: z.string().uuid("Invalid sector ID"),
    levelIds: z.array(z.string().uuid("Invalid level ID")).optional(),
    yearIds: z.array(z.string().uuid("Invalid year ID")).optional(),
  })
  .refine((data) => (data.levelIds?.length ?? 0) > 0 || (data.yearIds?.length ?? 0) > 0, {
    message: "At least one school level or year level is required",
    path: ["levelIds"],
  });

export type CreateSchoolParams = z.infer<typeof createSchoolSchema>;

// Schema for updating a school
export const updateSchoolSchema = z.object({
  name: z
    .string()
    .min(1, "School name is required")
    .max(255)
    .transform((val) => capitalizeSchoolName(val.trim()))
    .optional(),
  stateId: z.string().uuid("Invalid state ID").optional(),
  sectorId: z.string().uuid("Invalid sector ID").optional(),
  emailDomain: z.string().trim().max(255).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  bannerUrl: z.string().url("Invalid banner URL").optional().nullable(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
  levelIds: z.array(z.string().uuid("Invalid level ID")).optional(),
  yearIds: z.array(z.string().uuid("Invalid year ID")).optional(),
});

export type UpdateSchoolParams = z.infer<typeof updateSchoolSchema>;