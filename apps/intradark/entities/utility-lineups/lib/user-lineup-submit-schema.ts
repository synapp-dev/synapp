import { z } from "zod";

import { UTILITY_LINEUP_MS_STEP } from "@/entities/utility-lineups/lib/utility-lineup-ms-step";
import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";

const coord = z.number().min(0).max(1);

/** Nullable editorial / event timestamps (ms), multiples of 100 for scrubber UX */
export const optionalUtilityLineupMarkerMs = z
  .number()
  .int()
  .min(0)
  .refine((n) => n % UTILITY_LINEUP_MS_STEP === 0, {
    message: `Must be a multiple of ${UTILITY_LINEUP_MS_STEP} ms`,
  })
  .nullable()
  .optional();

export type UtilityLineupTimelineFields = {
  videoStartMs: number;
  videoEndMs?: number | null | undefined;
  stillStandMs?: number | null;
  stillThrowMs?: number | null;
  stillLandMs?: number | null;
  grenadeReleaseMs?: number | null;
  grenadeBloomMs?: number | null;
};

export function refineUtilityLineupTimelineFields(
  data: UtilityLineupTimelineFields,
  ctx: z.RefinementCtx,
): void {
  if (data.videoEndMs != null && data.videoEndMs <= data.videoStartMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "video_end_ms must be greater than video_start_ms when set.",
      path: ["videoEndMs"],
    });
  }

  const rel = data.grenadeReleaseMs;
  const bloom = data.grenadeBloomMs;
  if (rel != null && bloom != null && rel > bloom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "grenade_release_ms must be less than or equal to grenade_bloom_ms when both are set.",
      path: ["grenadeBloomMs"],
    });
  }

  const clipEnd = data.videoEndMs;
  if (clipEnd != null && clipEnd > 0) {
    const fields: [string, number | null | undefined][] = [
      ["stillStandMs", data.stillStandMs],
      ["stillThrowMs", data.stillThrowMs],
      ["stillLandMs", data.stillLandMs],
      ["grenadeReleaseMs", data.grenadeReleaseMs],
      ["grenadeBloomMs", data.grenadeBloomMs],
    ];
    for (const [path, ms] of fields) {
      if (ms != null && ms > clipEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be within playback end (${clipEnd} ms).`,
          path: [path],
        });
      }
    }
  }
}

/** Playback trim + editorial markers (developer edit / shared validation). */
export const utilityLineupTimelineEditSchema = z
  .object({
    videoStartMs: z.number().int().min(0),
    videoEndMs: z.number().int().min(0).nullable().optional(),
    stillStandMs: optionalUtilityLineupMarkerMs,
    stillThrowMs: optionalUtilityLineupMarkerMs,
    stillLandMs: optionalUtilityLineupMarkerMs,
    grenadeReleaseMs: optionalUtilityLineupMarkerMs,
    grenadeBloomMs: optionalUtilityLineupMarkerMs,
  })
  .superRefine(refineUtilityLineupTimelineFields);

/** Shared fields for finalize and upload-job payload (Zod 4: no `.omit()` on refined schemas). */
const userLineupJobPayloadFieldsSchema = z.object({
  mapId: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
  throwSpotX: coord,
  throwSpotY: coord,
  landSpotX: coord,
  landSpotY: coord,
  throwLabel: z.string().min(1).max(500),
  landLabel: z.string().min(1).max(500),
  grenadeType: z.enum(["smoke", "molotov", "flashbang", "he"]),
  side: z.enum(["t", "ct", "both"]),
  movement: z.enum([
    "stationary",
    "running",
    "walking",
    "crouched",
    "crouched_walking",
  ]),
  technique: z.enum([
    "left_click",
    "right_click",
    "left_and_right_click",
    "jump_left_click",
    "jump_right_click",
    "jump_left_and_right_click",
  ]),
  margin: z.enum(["low", "medium", "high"]),
  videoStartMs: z.number().int().min(0).default(0),
  videoEndMs: z.number().int().min(0).nullable().optional(),
  stillStandMs: optionalUtilityLineupMarkerMs,
  stillThrowMs: optionalUtilityLineupMarkerMs,
  stillLandMs: optionalUtilityLineupMarkerMs,
  grenadeReleaseMs: optionalUtilityLineupMarkerMs,
  grenadeBloomMs: optionalUtilityLineupMarkerMs,
  description: z.string().min(1).max(8000),
  setposText: z.string().max(4000).nullable().optional(),
  /** Client often sends `null`; `.optional()` alone only allows `undefined`. */
  youtubeUrl: z
    .union([z.string().url().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((s) => (s === "" || s === undefined || s === null ? null : s)),
  lineupImageUrl: z
    .union([z.string().url().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((s) => (s === "" || s === undefined || s === null ? null : s)),
});

function superRefineUserLineupTimeline<T extends z.infer<typeof userLineupJobPayloadFieldsSchema>>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  refineUtilityLineupTimelineFields(
    {
      videoStartMs: data.videoStartMs,
      videoEndMs: data.videoEndMs,
      stillStandMs: data.stillStandMs,
      stillThrowMs: data.stillThrowMs,
      stillLandMs: data.stillLandMs,
      grenadeReleaseMs: data.grenadeReleaseMs,
      grenadeBloomMs: data.grenadeBloomMs,
    },
    ctx,
  );
}

/** Wizard / job queue snapshot — server assigns `videoObjectPath` when creating the job row. */
export const userLineupJobPayloadSchema = userLineupJobPayloadFieldsSchema.superRefine(
  superRefineUserLineupTimeline,
);

export type UserLineupJobPayload = z.infer<typeof userLineupJobPayloadSchema>;

export const userLineupFinalizeSchema = userLineupJobPayloadFieldsSchema
  .extend({
    videoObjectPath: z.string().min(1).max(2048),
  })
  .superRefine(superRefineUserLineupTimeline);

export type UserLineupFinalizeInput = z.infer<typeof userLineupFinalizeSchema>;

export const utilityLineupUploadJobCreateSchema = userLineupJobPayloadFieldsSchema
  .extend({
    videoContentType: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
    videoByteLength: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    superRefineUserLineupTimeline(data, ctx);
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

export type UtilityLineupUploadJobCreateInput = z.infer<
  typeof utilityLineupUploadJobCreateSchema
>;
