/**
 * Pure parsing/normalization for member-supplied Spotify track links.
 *
 * Security boundary: the canonical URL produced here is the ONLY value that may
 * be persisted and later turned into an iframe `src`. Raw user input must never
 * be interpolated into an embed URL. Track links only — albums/playlists/etc.
 * are rejected.
 */

const TRACK_ID = /^[A-Za-z0-9]{22}$/;

export interface ParsedSpotifyTrack {
  /** 22-char base-62 track id. */
  id: string;
  /** `https://open.spotify.com/track/{id}` — the value to persist. */
  canonicalUrl: string;
}

function canonical(id: string): ParsedSpotifyTrack {
  return { id, canonicalUrl: `https://open.spotify.com/track/${id}` };
}

/**
 * Parse a Spotify track reference into a normalized id + canonical URL.
 * Accepts:
 *   - https://open.spotify.com/track/{id}            (with or without ?si=…)
 *   - https://open.spotify.com/intl-xx/track/{id}    (locale-prefixed)
 *   - spotify:track:{id}                             (URI form)
 * Returns null for anything else (other entity types, other hosts, garbage).
 */
export function parseSpotifyTrack(input: unknown): ParsedSpotifyTrack | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  // URI form: spotify:track:{id}
  const uriMatch = /^spotify:track:([A-Za-z0-9]+)$/.exec(raw);
  if (uriMatch) {
    const id = uriMatch[1]!;
    return TRACK_ID.test(id) ? canonical(id) : null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.hostname !== "open.spotify.com") return null;

  // Path is /track/{id} or /intl-xx/track/{id}. Drop a leading locale segment.
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] && /^intl-[a-z]{2}$/i.test(segments[0])) segments.shift();

  if (segments.length !== 2) return null;
  if (segments[0] !== "track") return null;

  const id = segments[1]!;
  return TRACK_ID.test(id) ? canonical(id) : null;
}

/**
 * Derive the track id from a stored canonical URL for building the embed `src`.
 * Returns null if the stored value is not a canonical track URL.
 */
export function trackIdFromCanonical(canonicalUrl: string | null | undefined): string | null {
  if (!canonicalUrl) return null;
  const match = /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})$/.exec(
    canonicalUrl,
  );
  return match ? match[1]! : null;
}
