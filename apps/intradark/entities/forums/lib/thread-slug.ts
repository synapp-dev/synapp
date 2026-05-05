const MAX_SLUG_LEN = 120;

/** Reserved thread slugs — must not collide with route `new`. */
export const FORUM_RESERVED_THREAD_SLUGS = new Set([
  "new",
  "admin",
  "api",
  "_next",
  "favicon.ico",
]);

export function slugifyThreadTitle(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, "");
  return normalized || "thread";
}

export function appendSlugSuffix(base: string, suffixIndex: number): string {
  const suffix = `-${suffixIndex}`;
  const maxBase = Math.max(1, MAX_SLUG_LEN - suffix.length);
  const trimmed = base.slice(0, maxBase).replace(/-+$/g, "");
  return `${trimmed}${suffix}`;
}

export function isValidThreadSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (!s || s.length > 160) return false;
  if (FORUM_RESERVED_THREAD_SLUGS.has(s)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}
