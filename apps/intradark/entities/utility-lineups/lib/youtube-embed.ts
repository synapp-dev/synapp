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
  url: string | null | undefined,
  videoStartMs: number,
  videoEndMs: number | null,
): string | null {
  if (url == null || url.trim() === "") return null;
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

/**
 * Preview embed (e.g. hover card): muted autoplay satisfies browser policies.
 * `controls=0` / `modestbranding=1` minimize chrome for a cleaner feed (YouTube may still show a
 * thin bar on pause/hover per their embed rules).
 */
export function buildYouTubeEmbedHoverPreviewSrc(
  url: string | null | undefined,
  videoStartMs: number,
  videoEndMs: number | null,
): string | null {
  const base = buildYouTubeEmbedSrc(url, videoStartMs, videoEndMs);
  if (!base) return null;
  const id = parseYouTubeVideoId(url ?? "");
  const join = base.includes("?") ? "&" : "?";
  // YouTube requires `playlist=<same video id>` for `loop=1` on a single embed.
  const loop =
    id != null ? `&loop=1&playlist=${encodeURIComponent(id)}` : "";
  return `${base}${join}autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1${loop}`;
}

/**
 * Same embed window as {@link buildYouTubeEmbedSrc} but paused at `start` — for “still frame” UX
 * (e.g. hold Shift on hover) where iframe pixels cannot be captured to canvas cross-origin.
 */
export function buildYouTubeEmbedPausedPreviewSrc(
  url: string | null | undefined,
  videoStartMs: number,
  videoEndMs: number | null,
): string | null {
  const base = buildYouTubeEmbedSrc(url, videoStartMs, videoEndMs);
  if (!base) return null;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}autoplay=0&mute=1&playsinline=1&controls=0&modestbranding=1`;
}
