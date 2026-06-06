import {
  appendSlugSuffix,
  slugifyForUrl,
  validateUrlSlug,
  type UrlSlugValidationCode,
} from "@/entities/content/lib/slug";

export { appendSlugSuffix };

/** URL segments reserved by routing or APIs — do not allow as article slugs. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "new",
  "_next",
  "favicon.ico",
]);

export type SlugValidationCode = UrlSlugValidationCode;

export function slugifyTitle(title: string): string {
  return slugifyForUrl(title, "article");
}

export function validateSlug(
  slug: string,
): { ok: true } | { ok: false; code: SlugValidationCode } {
  return validateUrlSlug(slug, RESERVED_SLUGS);
}
