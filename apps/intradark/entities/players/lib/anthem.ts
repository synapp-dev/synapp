/**
 * Parsing/normalization for a member's profile "anthem". Supports two providers:
 *
 *   - Spotify  → click-to-play iframe embed (no volume/seek control; Spotify
 *                exposes neither in its embed).
 *   - SoundCloud → Widget API embed which DOES allow setVolume + seek, so we set
 *                  volume to 25% and (when present) start playback at the `#t=`
 *                  timestamp from the shared link. Autoplay-with-sound is still
 *                  browser-gated.
 *
 * Security boundary: only the canonical URL produced here may be persisted and
 * later turned into an iframe `src`. Raw user input is never embedded directly.
 * The optional `#t=<seconds>` suffix is the only fragment we allow, and it is
 * re-derived from a strict integer so it can't carry arbitrary content.
 */

import { parseSpotifyTrack } from "@/entities/players/lib/spotify";

export type AnthemProvider = "spotify" | "soundcloud";

export interface ParsedAnthem {
  provider: AnthemProvider;
  /** Canonical URL to persist (Spotify track URL or SoundCloud track URL). */
  canonicalUrl: string;
}

const SOUNDCLOUD_HOSTS = new Set([
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
]);

const PERMALINK = /^[A-Za-z0-9_-]+$/;
const SOUNDCLOUD_CANONICAL =
  /^https:\/\/soundcloud\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+(#t=\d+)?$/;

/**
 * Convert a SoundCloud time reference (`H:MM:SS`, `M:SS`, `159`, or `159s`) into
 * whole seconds. Returns null for anything unparseable.
 */
function timeToSeconds(raw: string): number | null {
  const value = decodeURIComponent(raw.trim()).replace(/s$/, "");
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Pull a start offset (seconds) from a SoundCloud link's `#t=`/`?t=`, if any. */
function startSecondsFrom(url: URL): number | null {
  const fromHash = url.hash.startsWith("#t=") ? url.hash.slice(3) : null;
  const raw = fromHash ?? url.searchParams.get("t");
  if (!raw) return null;
  const seconds = timeToSeconds(raw);
  return seconds && seconds > 0 ? seconds : null;
}

/**
 * Parse a SoundCloud track link into a canonical `https://soundcloud.com/{user}/{track}`,
 * preserving an optional `#t=<seconds>` start offset. Rejects sets/playlists,
 * short (on.soundcloud.com) links, and non-track paths.
 */
export function parseSoundcloudTrack(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!SOUNDCLOUD_HOSTS.has(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  // A track is exactly /{user}/{track}. Sets are /{user}/sets/{slug} (3 segs).
  if (segments.length !== 2) return null;
  if (segments[1] === "sets") return null;
  if (!segments.every((s) => PERMALINK.test(s))) return null;

  const base = `https://soundcloud.com/${segments[0]}/${segments[1]}`;
  const start = startSecondsFrom(url);
  return start ? `${base}#t=${start}` : base;
}

/**
 * Split a canonical SoundCloud anthem URL into the bare track URL (for the
 * widget `url=` param) and an optional start offset in seconds.
 */
export function soundcloudEmbedParts(canonicalUrl: string): {
  url: string;
  startSeconds: number | null;
} {
  const [url, hash] = canonicalUrl.split("#t=");
  const startSeconds = hash ? Number(hash) : null;
  return {
    url: url ?? canonicalUrl,
    startSeconds: startSeconds && Number.isFinite(startSeconds) ? startSeconds : null,
  };
}

/**
 * Parse any supported anthem link (Spotify track or SoundCloud track) into a
 * normalized provider + canonical URL. Returns null for anything unsupported.
 */
export function parseAnthem(input: unknown): ParsedAnthem | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const spotify = parseSpotifyTrack(raw);
  if (spotify) {
    return { provider: "spotify", canonicalUrl: spotify.canonicalUrl };
  }

  const soundcloud = parseSoundcloudTrack(raw);
  if (soundcloud) {
    return { provider: "soundcloud", canonicalUrl: soundcloud };
  }

  return null;
}

/** Derive the provider from a stored canonical anthem URL. */
export function anthemProvider(
  canonicalUrl: string | null | undefined,
): AnthemProvider | null {
  if (!canonicalUrl) return null;
  if (/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(canonicalUrl)) {
    return "spotify";
  }
  if (SOUNDCLOUD_CANONICAL.test(canonicalUrl)) {
    return "soundcloud";
  }
  return null;
}
