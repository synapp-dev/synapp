import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/media/constants";

export function isAllowedUploadMime(mime: string): boolean {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedUploadSize(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= MAX_UPLOAD_BYTES;
}
