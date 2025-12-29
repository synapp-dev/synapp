/**
 * Utility functions for handling YouTube URLs
 */

/**
 * Checks if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com" ||
      urlObj.hostname === "youtu.be" ||
      urlObj.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the video ID from a YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;

    // Handle different YouTube URL formats
    if (urlObj.hostname === "youtu.be") {
      // Short format: https://youtu.be/VIDEO_ID
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.pathname === "/watch") {
      // Standard format: https://www.youtube.com/watch?v=VIDEO_ID
      videoId = urlObj.searchParams.get("v");
    } else if (urlObj.pathname.startsWith("/embed/")) {
      // Already an embed URL
      videoId = urlObj.pathname.split("/embed/")[1]?.split("?")[0];
    }

    return videoId;
  } catch {
    return null;
  }
}

/**
 * Gets the thumbnail URL for a YouTube video
 * @param url - YouTube video URL
 * @param quality - Thumbnail quality: 'maxresdefault', 'hqdefault', 'mqdefault', 'sddefault', 'default'
 */
export function getYouTubeThumbnailUrl(
  url: string,
  quality:
    | "maxresdefault"
    | "hqdefault"
    | "mqdefault"
    | "sddefault"
    | "default" = "hqdefault"
): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Converts a YouTube URL to an embed URL
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * @param url - YouTube video URL
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param hideControls - If true, hides YouTube player controls (default: false)
 */
export function convertToYouTubeEmbedUrl(
  url: string,
  startTime?: number | null,
  endTime?: number | null,
  hideControls: boolean = false
): string {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return url; // Return original URL if we can't parse it
  }

  try {
    // Build embed URL with parameters
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

    // Add start time if provided
    if (startTime != null && startTime > 0) {
      embedUrl.searchParams.set("start", Math.floor(startTime).toString());
    }

    // Add end time if provided (YouTube doesn't support end parameter directly,
    // but we can use it with the YouTube IFrame API if needed)
    if (endTime != null && endTime > 0) {
      embedUrl.searchParams.set("end", Math.floor(endTime).toString());
    }

    // Hide controls if requested
    if (hideControls) {
      embedUrl.searchParams.set("controls", "0"); // Hide player controls
      embedUrl.searchParams.set("disablekb", "1"); // Disable keyboard controls
      embedUrl.searchParams.set("fs", "0"); // Hide fullscreen button
      embedUrl.searchParams.set("iv_load_policy", "3"); // Hide annotations
    }

    // Enable autoplay and other useful parameters
    embedUrl.searchParams.set("rel", "0"); // Don't show related videos
    embedUrl.searchParams.set("modestbranding", "1"); // Less YouTube branding (set to 1 for cleaner video previews)

    return embedUrl.toString();
  } catch {
    return url; // Return original URL if parsing fails
  }
}
