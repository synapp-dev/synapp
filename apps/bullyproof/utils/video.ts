/**
 * Unified utility functions for handling YouTube and Vimeo URLs
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
 * Checks if a URL is a Vimeo URL
 */
export function isVimeoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "www.vimeo.com" ||
      urlObj.hostname === "vimeo.com" ||
      urlObj.hostname === "player.vimeo.com"
    );
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is a YouTube or Vimeo URL
 */
export function isVideoUrl(url: string): boolean {
  return isYouTubeUrl(url) || isVimeoUrl(url);
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
 * Extracts the video ID from a Vimeo URL
 * Supports:
 * - https://vimeo.com/VIDEO_ID
 * - https://www.vimeo.com/VIDEO_ID
 * - https://vimeo.com/channels/CHANNEL/VIDEO_ID
 * - https://vimeo.com/groups/GROUP/videos/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 */
export function extractVimeoVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;

    if (urlObj.hostname === "player.vimeo.com") {
      // Embed format: https://player.vimeo.com/video/VIDEO_ID
      const match = urlObj.pathname.match(/\/video\/(\d+)/);
      if (match && match[1]) {
        videoId = match[1];
      }
    } else if (urlObj.hostname === "vimeo.com" || urlObj.hostname === "www.vimeo.com") {
      // Standard format: https://vimeo.com/VIDEO_ID
      // Also handles: /channels/.../VIDEO_ID, /groups/.../videos/VIDEO_ID
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      
      // Find the last numeric part (video ID)
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        // Vimeo IDs are numeric
        if (/^\d+$/.test(part)) {
          videoId = part;
          break;
        }
      }
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
 * Gets the thumbnail URL for a Vimeo video
 * Note: Vimeo requires API access for thumbnails, but we can use a placeholder
 * or the oEmbed API endpoint. For now, we'll return null and let the component handle it.
 * @param url - Vimeo video URL
 */
export function getVimeoThumbnailUrl(url: string): string | null {
  // Vimeo doesn't provide direct thumbnail URLs like YouTube
  // Would need to use oEmbed API: https://vimeo.com/api/oembed.json?url={url}
  // For now, return null - components can handle this by using the video element's poster
  return null;
}

/**
 * Gets the thumbnail URL for a video (YouTube or Vimeo)
 * @param url - Video URL
 */
export function getVideoThumbnailUrl(url: string): string | null {
  if (isYouTubeUrl(url)) {
    return getYouTubeThumbnailUrl(url);
  } else if (isVimeoUrl(url)) {
    return getVimeoThumbnailUrl(url);
  }
  return null;
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

/**
 * Converts a Vimeo URL to an embed URL
 * Supports:
 * - https://vimeo.com/VIDEO_ID
 * - https://www.vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 * @param url - Vimeo video URL
 * @param startTime - Start time in seconds (Vimeo uses hash fragment: #t=30s)
 * @param endTime - End time in seconds (not directly supported in embed URL)
 */
export function convertToVimeoEmbedUrl(
  url: string,
  startTime?: number | null,
  endTime?: number | null
): string {
  const videoId = extractVimeoVideoId(url);

  if (!videoId) {
    return url; // Return original URL if we can't parse it
  }

  try {
    // Build embed URL
    const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);

    // Vimeo uses hash fragments for start time: #t=30s
    // Note: endTime is not directly supported in Vimeo embed URLs
    if (startTime != null && startTime > 0) {
      embedUrl.hash = `t=${Math.floor(startTime)}s`;
    }

    return embedUrl.toString();
  } catch {
    return url; // Return original URL if parsing fails
  }
}

/**
 * Gets the embed URL for a video (YouTube or Vimeo)
 * @param url - Video URL
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param hideControls - If true, hides YouTube player controls (default: false, only applies to YouTube)
 */
export function getVideoEmbedUrl(
  url: string,
  startTime?: number | null,
  endTime?: number | null,
  hideControls: boolean = false
): string | null {
  if (isYouTubeUrl(url)) {
    return convertToYouTubeEmbedUrl(url, startTime, endTime, hideControls);
  } else if (isVimeoUrl(url)) {
    return convertToVimeoEmbedUrl(url, startTime, endTime);
  }
  return null;
}

// Re-export YouTube functions for backward compatibility
export {
  isYouTubeUrl,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  convertToYouTubeEmbedUrl,
};
