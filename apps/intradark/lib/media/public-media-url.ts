import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";

/** Public object URL for `intradark-media` (bucket is public read). */
export function intradarkMediaPublicUrl(objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const trimmed = objectPath.trim().replace(/^\/+/, "");
  const encoded = trimmed
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${base}/storage/v1/object/public/${INTRADARK_MEDIA_BUCKET}/${encoded}`;
}
