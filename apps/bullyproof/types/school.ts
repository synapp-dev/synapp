/** Primary key on `schools` — use in DB/API after resolution. */
export type SchoolId = string;

/** URL route segment under `/schools/{slug}/` — not a UUID. */
export type SchoolSlug = string;

/** Ambiguous input that may be a slug or UUID — resolve at boundaries. */
export type SchoolRefInput = string;

export type ResolvedSchoolRef = {
  id: SchoolId;
  slug: SchoolSlug;
};
