import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";

/** Public object URL when the bucket is `public`. */
export function getPublicMediaObjectUrl(
  supabaseProjectUrl: string,
  objectPath: string,
): string {
  const base = supabaseProjectUrl.replace(/\/+$/, "");
  const encoded = objectPath
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${base}/storage/v1/object/public/${INTRADARK_MEDIA_BUCKET}/${encoded}`;
}
