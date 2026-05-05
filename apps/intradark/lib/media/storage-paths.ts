import {
  type MediaPrefix,
  MEDIA_PREFIXES,
} from "@/lib/media/constants";

const segmentPattern = /^[a-z0-9][a-z0-9._-]*$/i;

function isMediaPrefix(value: string): value is MediaPrefix {
  return (MEDIA_PREFIXES as readonly string[]).includes(value);
}

/**
 * Validates a storage object path under `intradark-media` (no leading slash).
 * Allowed shape: `{prefix}/{segment}/...` with safe segments (no `..`, no empty).
 */
export function validateMediaObjectPath(raw: string):
  | { ok: true; path: string }
  | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/^\/+/, "");
  if (!trimmed) {
    return { ok: false, error: "Path is empty." };
  }
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    return { ok: false, error: "Invalid path." };
  }
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, error: "Path must include a prefix and at least one segment." };
  }
  const prefix = parts[0]!;
  if (!isMediaPrefix(prefix)) {
    return {
      ok: false,
      error: `Unknown prefix "${prefix}". Use one of: ${MEDIA_PREFIXES.join(", ")}.`,
    };
  }
  for (const seg of parts.slice(1)) {
    if (!seg || seg === "." || seg === "..") {
      return { ok: false, error: "Empty or invalid path segment." };
    }
    if (!segmentPattern.test(seg)) {
      return {
        ok: false,
        error: `Invalid segment "${seg}" (use letters, numbers, dot, underscore, hyphen).`,
      };
    }
  }
  return { ok: true, path: parts.join("/") };
}
