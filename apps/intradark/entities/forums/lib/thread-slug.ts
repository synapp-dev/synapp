import {
  appendSlugSuffix,
  isValidUrlSlug,
  slugifyForUrl,
} from "@/entities/content/lib/slug";

export { appendSlugSuffix };

/** Reserved thread slugs — must not collide with route `new`. */
export const FORUM_RESERVED_THREAD_SLUGS = new Set([
  "new",
  "admin",
  "api",
  "_next",
  "favicon.ico",
]);

export function slugifyThreadTitle(title: string): string {
  return slugifyForUrl(title, "thread");
}

export function isValidThreadSlug(slug: string): boolean {
  return isValidUrlSlug(slug, FORUM_RESERVED_THREAD_SLUGS);
}
