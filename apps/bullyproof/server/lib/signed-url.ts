/**
 * Shared helper for DB-cached signed URL resolution.
 *
 * Signed URLs are stored directly on slide rows (signed_url + signed_url_updated_at).
 * When a slide is fetched, we check whether the cached URL is still "fresh" (< 30 min).
 * If fresh, return it immediately (zero Supabase calls). If stale or missing, generate
 * a new one and update the row (fire-and-forget).
 *
 * The 30-minute threshold is just our refresh cadence. The actual Supabase signed URL
 * remains valid for 1 week, so even a "stale" cached URL still works for viewers.
 *
 * Concurrency is limited to avoid "Too many connections issued to the database" when
 * fetching many topics with slides (e.g. GET /api/topics?includeSlides=true&includeUrls=true).
 */

import { createServerClient } from "@/utils/supabase/server";
import { toStorageUrl } from "@/utils/supabase/storage-url";

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const SIGNED_URL_CONCURRENCY = 6; // Limit concurrent Supabase Storage + DB updates
const SIGNED_URL_EXPIRY_S = 604800; // 1 week in seconds
const BUCKET = "content";

/** Pattern to extract the storage path from a Supabase public URL. */
const PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;

interface SlideWithSignedUrl {
  id: string;
  signedUrl: string | null;
  signedUrlUpdatedAt: string | null;
}

type UpdateSignedUrlFn = (id: string, signedUrl: string) => Promise<void>;

/** Semaphore to limit concurrent signed URL generation and DB updates. */
let _activeCount = 0;
const _waitQueue: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (_activeCount >= SIGNED_URL_CONCURRENCY) {
    await new Promise<void>((resolve) => _waitQueue.push(resolve));
  }
  _activeCount++;
  try {
    return await fn();
  } finally {
    _activeCount--;
    const next = _waitQueue.shift();
    if (next) next();
  }
}

/**
 * Extracts the relative storage path from a value that might be:
 * - A full Supabase public URL (e.g. https://…/storage/v1/object/public/content/slides/…)
 * - A bare storage path (e.g. slides/topics/s1/t1/uuid.jpg)
 * - An external URL (YouTube, Vimeo, etc.)
 * - A blob: or data: URL
 *
 * Returns the storage path if it's a Supabase URL or bare path, or null if it's
 * an external/non-storage URL that shouldn't be signed.
 */
function extractStoragePath(urlOrPath: string): string | null {
  // blob: and data: URLs — not storage, pass through as-is (handled by caller)
  if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) {
    return null;
  }

  // If it's not an HTTP URL, treat it as a bare storage path
  if (!urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  // It's an HTTP URL — check if it's a Supabase storage URL
  const match = urlOrPath.match(PUBLIC_URL_PATTERN);
  if (match) {
    return match[1]; // e.g. "slides/topics/s1/t1/uuid.jpg"
  }

  // External URL (YouTube, Vimeo, etc.) — not storage
  return null;
}

/**
 * Returns a signed URL for a slide's storage-hosted media.
 *
 * - If the cached signed URL is fresh (< 30 min old), returns it directly.
 * - If stale or missing, generates a new one via Supabase Storage and
 *   updates the DB row in the background (fire-and-forget).
 * - External URLs (YouTube, Vimeo, blob:, data:) are returned as-is.
 * - Handles both full Supabase public URLs and bare storage paths in image_url/video_url.
 * - Returns null if no mediaUrl is provided.
 *
 * @param slide     The slide row with cached signed URL fields
 * @param mediaUrl  The image_url or video_url value (may be a full URL or storage path)
 * @param updateFn  Repo function to persist the new signed URL to the slide row
 */
export async function refreshSignedUrlIfStale(
  slide: SlideWithSignedUrl,
  mediaUrl: string | null | undefined,
  updateFn: UpdateSignedUrlFn
): Promise<string | null> {
  if (!mediaUrl) return null;

  // Extract the storage path — returns null for non-storage URLs
  const storagePath = extractStoragePath(mediaUrl);

  if (storagePath === null) {
    // blob:, data:, or external URL — return as-is (no signing needed)
    return mediaUrl;
  }

  // If the cached URL is fresh, return it directly — zero Supabase calls
  if (slide.signedUrl && slide.signedUrlUpdatedAt) {
    const age = Date.now() - new Date(slide.signedUrlUpdatedAt).getTime();
    if (age < STALE_THRESHOLD_MS) {
      return toStorageUrl(slide.signedUrl) ?? slide.signedUrl;
    }
  }

  // Stale or missing — generate a new signed URL (single Supabase call, no list())
  return withConcurrencyLimit(async () => {
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_S);

      if (error) {
        console.warn(
          `[signed-url] Failed to generate signed URL for ${storagePath}:`,
          error.message
        );
        // Return stale cached URL if available — it's still valid for up to 1 week
        return slide.signedUrl
          ? (toStorageUrl(slide.signedUrl) ?? slide.signedUrl)
          : null;
      }

      const url = data.signedUrl;

      // Fire-and-forget DB update — don't block the response
      updateFn(slide.id, url).catch((e) =>
        console.warn(
          `[signed-url] Failed to cache signed URL for slide ${slide.id}:`,
          e
        )
      );

      return toStorageUrl(url) ?? url;
    } catch (e) {
      console.error(
        `[signed-url] Unexpected error for slide ${slide.id}:`,
        e
      );
      return slide.signedUrl
        ? (toStorageUrl(slide.signedUrl) ?? slide.signedUrl)
        : null;
    }
  });
}
