import { z } from "zod";

import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";

const grenadeTypeSchema = z.enum(["smoke", "molotov", "flashbang", "he"]);

const baseEnemyPovFields = z.object({
  /** Parent `utility_lineups.id` returned from main lineup finalize. */
  lineupId: z.string().uuid(),
  /** Repeated client-side for path validation; server cross-checks against the lineup. */
  mapSlug: z.string().min(1).max(128),
  grenadeType: grenadeTypeSchema,
  description: z
    .union([z.string().max(8000), z.literal(""), z.null()])
    .optional()
    .transform((s) => (s === "" || s === undefined || s === null ? null : s)),
  videoStartMs: z.number().int().min(0).default(0),
  videoEndMs: z.number().int().min(0).nullable().optional(),
});

function refineEnemyPovTimeline(
  data: { videoStartMs: number; videoEndMs?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (data.videoEndMs != null && data.videoEndMs <= data.videoStartMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "video_end_ms must be greater than video_start_ms when set.",
      path: ["videoEndMs"],
    });
  }
}

/** Wizard / job creation snapshot — server assigns `videoObjectPath`. */
export const enemyPovUploadJobCreateSchema = baseEnemyPovFields
  .extend({
    videoContentType: z.enum([
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]),
    videoByteLength: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    refineEnemyPovTimeline(data, ctx);
    if (!isAllowedUtilityLineupVideoMime(data.videoContentType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported video type.",
        path: ["videoContentType"],
      });
    }
    if (!isAllowedUtilityLineupVideoSize(data.videoByteLength)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video file is too large.",
        path: ["videoByteLength"],
      });
    }
  });

export type EnemyPovUploadJobCreateInput = z.infer<
  typeof enemyPovUploadJobCreateSchema
>;

/** Server-side persisted job snapshot; finalize re-validates against this shape. */
export const enemyPovJobPayloadSchema = baseEnemyPovFields.superRefine(
  refineEnemyPovTimeline,
);

export type EnemyPovJobPayload = z.infer<typeof enemyPovJobPayloadSchema>;

export const enemyPovFinalizeSchema = baseEnemyPovFields
  .extend({ videoObjectPath: z.string().min(1).max(2048) })
  .superRefine(refineEnemyPovTimeline);

export type EnemyPovFinalizeInput = z.infer<typeof enemyPovFinalizeSchema>;
