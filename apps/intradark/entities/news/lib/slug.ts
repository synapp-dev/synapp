const MAX_SLUG_LEN = 120;

/** URL segments reserved by routing or APIs — do not allow as article slugs. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "new",
  "_next",
  "favicon.ico",
]);

export type SlugValidationCode =
  | "empty"
  | "reserved"
  | "invalid_chars"
  | "too_long";

export function slugifyTitle(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, "");
  return normalized || "article";
}

export function appendSlugSuffix(base: string, suffixIndex: number): string {
  const suffix = `-${suffixIndex}`;
  const maxBase = Math.max(1, MAX_SLUG_LEN - suffix.length);
  const trimmed = base.slice(0, maxBase).replace(/-+$/g, "");
  return `${trimmed}${suffix}`;
}

export function validateSlug(
  slug: string,
): { ok: true } | { ok: false; code: SlugValidationCode } {
  const s = slug.trim().toLowerCase();
  if (!s) return { ok: false, code: "empty" };
  if (s.length > 160) return { ok: false, code: "too_long" };
  if (RESERVED_SLUGS.has(s)) return { ok: false, code: "reserved" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    return { ok: false, code: "invalid_chars" };
  }
  return { ok: true };
}
