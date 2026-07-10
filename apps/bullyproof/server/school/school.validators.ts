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
    sort: z.enum(["latest"]).optional(),
  })
  .transform((v) => ({
    limit: v.limit ?? 50,
    offset: v.offset ?? 0,
    search: v.search,
    sort: v.sort,
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
    /** Content type the school runs; defaults to the Default type when omitted. */
    contentTypeId: z.string().uuid("Invalid content type ID").optional(),
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
  bannerUrl: z
    .union([
      z.string().url("Invalid banner URL"),
      z.string().regex(
        /^schools\/(images\/banner\/|[a-f0-9-]+\/images\/banner\.)/,
        "Invalid storage path"
      ),
    ])
    .optional()
    .nullable(),
  avatarUrl: z
    .union([
      z.string().url("Invalid avatar URL"),
      z.string().regex(
        /^schools\/(images\/avatar\/|[a-f0-9-]+\/images\/avatar\.)/,
        "Invalid storage path"
      ),
    ])
    .optional()
    .nullable(),
  levelIds: z.array(z.string().uuid("Invalid level ID")).optional(),
  yearIds: z.array(z.string().uuid("Invalid year ID")).optional(),
});

export type UpdateSchoolParams = z.infer<typeof updateSchoolSchema>;