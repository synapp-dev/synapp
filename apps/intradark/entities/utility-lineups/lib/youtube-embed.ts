const ALLOWED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
]);

/**
 * Extract YouTube video id from common URL shapes. Returns null if not allowed / not found.
 */
export function parseYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return null;
  }
  if (parsed.hostname === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "").split("/")[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }
  if (parsed.pathname === "/watch") {
    const v = parsed.searchParams.get("v");
    return v && /^[\w-]{6,}$/.test(v) ? v : null;
  }
  if (parsed.pathname.startsWith("/embed/")) {
    const id = parsed.pathname.replace(/^\/embed\//, "").split("/")[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }
  if (parsed.pathname.startsWith("/shorts/")) {
    const id = parsed.pathname.replace(/^\/shorts\//, "").split("/")[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }
  return null;
}

/**
 * Build `https://www.youtube-nocookie.com/embed/{id}?...` for iframe src.
 */
export function buildYouTubeEmbedSrc(
  url: string,
  videoStartMs: number,
  videoEndMs: number | null,
): string | null {
  const id = parseYouTubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  params.set("rel", "0");
  if (videoStartMs > 0) {
    params.set("start", String(Math.floor(videoStartMs / 1000)));
  }
  if (videoEndMs != null && videoEndMs > 0) {
    params.set("end", String(Math.floor(videoEndMs / 1000)));
  }
  const q = params.toString();
  return `https://www.youtube-nocookie.com/embed/${id}${q ? `?${q}` : ""}`;
}
