import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Extracts the storage path from a Supabase public URL or returns the path if it's already a path.
 * 
 * Supabase public URLs have the format:
 * https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
 * 
 * @param urlOrPath - Either a Supabase public URL or a storage path
 * @returns The storage path
 */
function extractStoragePath(urlOrPath: string): string {
  // If it's already a path (doesn't start with http), return it as-is
  if (!urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  // Try to extract path from Supabase public URL
  const publicUrlPattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
  const match = urlOrPath.match(publicUrlPattern);
  
  if (match) {
    // Return the path part (everything after the bucket name)
    return match[2];
  }

  // If we can't extract a path, try to use the URL as-is (might be a different format)
  // Or extract everything after the last slash
  const lastSlashIndex = urlOrPath.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    return urlOrPath.substring(lastSlashIndex + 1);
  }

  // Fallback: return the original value
  return urlOrPath;
}

/**
 * Generates a signed URL for a Supabase storage file.
 *
 * @param urlOrPath - Either a Supabase public URL or a storage path
 * @param supabase - The Supabase client instance
 * @param expiresIn - Expiry time in seconds (default: 604800 = 1 week)
 * @returns The signed URL, or null if generation fails (caller must not pass path to Image src)
 */
export async function getSignedUrl(
  urlOrPath: string,
  supabase: SupabaseClient<Database>,
  expiresIn: number = 604800
): Promise<string | null> {
  // Skip data URLs and other non-storage URLs - return as-is only if it's a valid URL
  if (urlOrPath.startsWith("data:") || !urlOrPath) {
    return urlOrPath;
  }
  if (urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  try {
    const storagePath = extractStoragePath(urlOrPath);

    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.warn(
        `Failed to generate signed URL for ${urlOrPath}:`,
        error.message
      );
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`Error generating signed URL for ${urlOrPath}:`, error);
    return null;
  }
}
