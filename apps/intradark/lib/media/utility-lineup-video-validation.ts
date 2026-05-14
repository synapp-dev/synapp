import {
  ALLOWED_UTILITY_LINEUP_VIDEO_MIME_TYPES,
  MAX_UTILITY_LINEUP_VIDEO_BYTES,
} from "@/lib/media/constants";

export function isAllowedUtilityLineupVideoMime(mime: string): boolean {
  return (ALLOWED_UTILITY_LINEUP_VIDEO_MIME_TYPES as readonly string[]).includes(
    mime,
  );
}

export function isAllowedUtilityLineupVideoSize(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= MAX_UTILITY_LINEUP_VIDEO_BYTES;
}
