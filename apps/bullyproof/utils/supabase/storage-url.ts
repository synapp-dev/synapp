/**
 * Rewrites Supabase storage URLs to use the configured NEXT_PUBLIC_SUPABASE_URL host.
 * Ensures thumbnails/previews work when using a custom API domain (e.g. for school networks
 * that block *.supabase.co).
 */

const DEFAULT_SUPABASE_HOST = "sukurbtgprvxgoeagich.supabase.co";
const STORAGE_PATH_PREFIX = "/storage/v1/object/";

/**
 * Normalizes a Supabase storage URL to use the host from NEXT_PUBLIC_SUPABASE_URL.
 * If the URL points at the default project host, it is rewritten so the browser
 * loads from the configured domain (custom or default).
 *
 * @param url - A full storage URL (public or signed), or null/undefined
 * @returns The same URL with host rewritten, or the original value (or null)
 */
export function toStorageUrl(
  url: string | null | undefined
): string | null | undefined {
  if (url == null || url === "") return url;
  if (!url.startsWith("https://")) return url;
  if (!url.includes(STORAGE_PATH_PREFIX)) return url;

  const configuredBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredBase) return url;

  try {
    const parsed = new URL(url);
    if (parsed.host !== DEFAULT_SUPABASE_HOST) return url;

    const baseUrl = configuredBase.replace(/\/$/, "");
    const baseParsed = new URL(baseUrl);
    parsed.protocol = baseParsed.protocol;
    parsed.host = baseParsed.host;
    return parsed.toString();
  } catch {
    return url;
  }
}
