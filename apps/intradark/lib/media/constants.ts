export const INTRADARK_MEDIA_BUCKET = "intradark-media" as const;

export const MEDIA_PREFIXES = ["maps", "players", "news", "utility"] as const;
export type MediaPrefix = (typeof MEDIA_PREFIXES)[number];

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Matches `0007_media_maps_storage.sql` `file_size_limit` on the bucket. */
export const MAX_UPLOAD_BYTES = 52_428_800;
