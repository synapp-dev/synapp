export const INTRADARK_MEDIA_BUCKET = "intradark-media" as const;

export const MEDIA_PREFIXES = ["maps", "players", "news", "utility", "avatars"] as const;
export type MediaPrefix = (typeof MEDIA_PREFIXES)[number];

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Matches `0007_media_maps_storage.sql` `file_size_limit` on the bucket (images). */
export const MAX_UPLOAD_BYTES = 52_428_800;

/** 250 MiB (250 × 1024² bytes) — file-size megabytes, not megabits; matches lineup bucket migration. */
export const DEFAULT_MAX_UTILITY_LINEUP_VIDEO_BYTES = 262_144_000;

/**
 * Max size for user-uploaded lineup videos (client + `/api/media/utility-lineup-upload-url`).
 *
 * Defaults to {@link DEFAULT_MAX_UTILITY_LINEUP_VIDEO_BYTES}. Override with
 * `NEXT_PUBLIC_MAX_UTILITY_LINEUP_VIDEO_BYTES` when your Supabase **global** Storage limit,
 * **per-bucket** `file_size_limit`, or local `supabase/config.toml` `[storage] file_size_limit`
 * differ (e.g. Free tier: set to `52428800` so the UI matches a 50 MiB cap).
 *
 * @see https://supabase.com/docs/guides/storage/uploads/file-limits
 */
const maxUtilityVideoFromEnv = Number(
  process.env.NEXT_PUBLIC_MAX_UTILITY_LINEUP_VIDEO_BYTES,
);
export const MAX_UTILITY_LINEUP_VIDEO_BYTES =
  Number.isFinite(maxUtilityVideoFromEnv) && maxUtilityVideoFromEnv > 0
    ? Math.floor(maxUtilityVideoFromEnv)
    : DEFAULT_MAX_UTILITY_LINEUP_VIDEO_BYTES;

export const ALLOWED_UTILITY_LINEUP_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
