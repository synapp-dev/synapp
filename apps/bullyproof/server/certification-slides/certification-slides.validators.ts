import { z } from "zod";

// Schema for creating a certification slide
export const createCertificationSlideSchema = z
  .object({
    topicId: z.string().trim().min(1).max(500),
    orderIndex: z.number().int().min(0),
    kind: z.enum(["image", "video", "text"]).default("image"),
    imageUrl: z.union([z.string().url(), z.null()]).optional(),
    videoUrl: z.union([z.string().url(), z.null()]).optional(),
    textHtml: z.union([z.string(), z.null()]).optional(),
    videoStartS: z.union([z.number(), z.null()]).optional(),
    videoEndS: z.union([z.number(), z.null()]).optional(),
  })
  .refine(
    (data) => {
      if (data.kind === "image") {
        return (
          data.imageUrl !== null &&
          data.imageUrl !== undefined &&
          !data.videoUrl &&
          !data.textHtml
        );
      }
      if (data.kind === "video") {
        return (
          data.videoUrl !== null &&
          data.videoUrl !== undefined &&
          !data.imageUrl &&
          !data.textHtml
        );
      }
      if (data.kind === "text") {
        return (
          data.textHtml !== null &&
          data.textHtml !== undefined &&
          !data.imageUrl &&
          !data.videoUrl
        );
      }
      return true;
    },
    {
      message: "Slide type constraints not met",
    }
  );

export type CreateCertificationSlideParams = z.infer<
  typeof createCertificationSlideSchema
>;

// Schema for updating a certification slide
export const updateCertificationSlideSchema = z
  .object({
    kind: z.enum(["image", "video", "text"]).optional(),
    imageUrl: z.union([z.string().url(), z.null()]).optional(),
    videoUrl: z.union([z.string().url(), z.null()]).optional(),
    textHtml: z.union([z.string(), z.null()]).optional(),
    videoStartS: z.union([z.number(), z.null()]).optional(),
    videoEndS: z.union([z.number(), z.null()]).optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.kind === "image") {
        return !data.videoUrl && !data.textHtml;
      }
      if (data.kind === "video") {
        return !data.imageUrl && !data.textHtml;
      }
      if (data.kind === "text") {
        return !data.imageUrl && !data.videoUrl;
      }
      return true;
    },
    {
      message: "Slide type constraints not met",
    }
  );

export type UpdateCertificationSlideParams = z.infer<
  typeof updateCertificationSlideSchema
>;

// Schema for bulk save operations
export const bulkSaveCertificationSlidesSchema = z.object({
  topicId: z.string().trim().min(1).max(500),
  creates: z
    .array(
      z.object({
        tempId: z.string().optional(), // For file mapping
        orderIndex: z.number().int().min(0),
        kind: z.enum(["image", "video", "text"]),
        imageUrl: z.union([z.string().url(), z.null()]).optional(),
        videoUrl: z.union([z.string().url(), z.null()]).optional(),
        textHtml: z.union([z.string(), z.null()]).optional(),
        videoStartS: z.union([z.number(), z.null()]).optional(),
        videoEndS: z.union([z.number(), z.null()]).optional(),
      })
    )
    .optional(),
  updates: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(500),
        kind: z.enum(["image", "video", "text"]).optional(),
        imageUrl: z.union([z.string().url(), z.null()]).optional(),
        videoUrl: z.union([z.string().url(), z.null()]).optional(),
        textHtml: z.union([z.string(), z.null()]).optional(),
        videoStartS: z.union([z.number(), z.null()]).optional(),
        videoEndS: z.union([z.number(), z.null()]).optional(),
      })
    )
    .optional(),
  deletes: z.array(z.string().trim().min(1).max(500)).optional(),
  reorder: z.array(z.string().trim().min(1).max(500)).optional(),
});

export type BulkSaveCertificationSlidesParams = z.infer<
  typeof bulkSaveCertificationSlidesSchema
>;
