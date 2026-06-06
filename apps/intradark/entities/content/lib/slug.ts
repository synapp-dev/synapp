export const MAX_URL_SLUG_LEN = 120;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type UrlSlugValidationCode =
  | "empty"
  | "reserved"
  | "invalid_chars"
  | "too_long";

/** Lowercase hyphenated URL segment from free text. */
export function slugifyForUrl(text: string, fallback: string): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_URL_SLUG_LEN)
    .replace(/-+$/g, "");
  return normalized || fallback;
}

export function appendSlugSuffix(base: string, suffixIndex: number): string {
  const suffix = `-${suffixIndex}`;
  const maxBase = Math.max(1, MAX_URL_SLUG_LEN - suffix.length);
  const trimmed = base.slice(0, maxBase).replace(/-+$/g, "");
  return `${trimmed}${suffix}`;
}

export function validateUrlSlug(
  slug: string,
  reservedSlugs: ReadonlySet<string>,
): { ok: true } | { ok: false; code: UrlSlugValidationCode } {
  const s = slug.trim().toLowerCase();
  if (!s) return { ok: false, code: "empty" };
  if (s.length > 160) return { ok: false, code: "too_long" };
  if (reservedSlugs.has(s)) return { ok: false, code: "reserved" };
  if (!SLUG_PATTERN.test(s)) {
    return { ok: false, code: "invalid_chars" };
  }
  return { ok: true };
}

export function isValidUrlSlug(
  slug: string,
  reservedSlugs: ReadonlySet<string>,
): boolean {
  return validateUrlSlug(slug, reservedSlugs).ok;
}

/**
 * Finds the first unused slug by appending `-2`, `-3`, … when `isTaken` returns true.
 */
export async function allocateUniqueUrlSlug(input: {
  preferred: string;
  slugify: (text: string) => string;
  validate: (
    slug: string,
  ) => { ok: true } | { ok: false; code: UrlSlugValidationCode };
  isTaken: (candidate: string) => Promise<boolean>;
  /** Also skip candidates that fail `validate` (e.g. reserved slugs). */
  skipInvalid?: boolean;
  maxAttempts?: number;
}): Promise<string> {
  const validated = input.validate(input.preferred);
  const base = validated.ok ? input.preferred : input.slugify(input.preferred);
  let candidate = base;
  let n = 2;
  const maxAttempts = input.maxAttempts ?? 500;
  const skipInvalid = input.skipInvalid ?? false;

  if (skipInvalid) {
    while (!input.validate(candidate).ok) {
      candidate = appendSlugSuffix(base, n);
      n += 1;
      if (n > maxAttempts) {
        return `${base}-${Date.now().toString(36)}`;
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (skipInvalid && !input.validate(candidate).ok) {
      candidate = appendSlugSuffix(base, n);
      n += 1;
      continue;
    }
    const taken = await input.isTaken(candidate);
    if (!taken) return candidate;
    candidate = appendSlugSuffix(base, n);
    n += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}
