import { z } from "zod";

/**
 * A content type is created from an ordered list of level names. The sheet also
 * carries an explicit level count; the two must agree (the count is the visible
 * control, the names are the rows). Level count is derived and re-checked here so
 * a malformed client cannot desync them.
 */
export const createContentTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    levelCount: z.number().int().min(1),
    levelNames: z
      .array(z.string().trim().min(1, "Level name is required"))
      .min(1, "At least one level is required"),
    /** When present, deep-copy the whole tree of this source type as a template. */
    sourceContentTypeId: z.string().uuid().optional(),
  })
  .refine((v) => v.levelNames.length === v.levelCount, {
    message: "Level count must match the number of level names",
    path: ["levelNames"],
  });

/**
 * Update carries an optional rename and/or an edited level-name list. is_default
 * is intentionally absent: the Default flag cannot be set or cleared through the
 * API (service-enforced), and renaming Default is allowed.
 */
export const updateContentTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    levelCount: z.number().int().min(1).optional(),
    levelNames: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine(
    (v) =>
      v.levelNames === undefined ||
      v.levelCount === undefined ||
      v.levelNames.length === v.levelCount,
    {
      message: "Level count must match the number of level names",
      path: ["levelNames"],
    },
  )
  .refine((v) => v.name !== undefined || v.levelNames !== undefined, {
    message: "Nothing to update",
  });

export type CreateContentTypeParams = z.infer<typeof createContentTypeSchema>;
export type UpdateContentTypeParams = z.infer<typeof updateContentTypeSchema>;
