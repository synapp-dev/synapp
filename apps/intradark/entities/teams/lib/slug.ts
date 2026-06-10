import {
  slugifyForUrl,
  validateUrlSlug,
  type UrlSlugValidationCode,
} from "@/entities/content/lib/slug";

import { TEAM_RESERVED_SLUGS } from "./reserved-slugs";

export type TeamSlugValidationCode = UrlSlugValidationCode;

export function slugifyTeamName(name: string): string {
  return slugifyForUrl(name, "team");
}

export function validateTeamSlug(
  slug: string,
): { ok: true } | { ok: false; code: TeamSlugValidationCode } {
  return validateUrlSlug(slug, TEAM_RESERVED_SLUGS);
}
