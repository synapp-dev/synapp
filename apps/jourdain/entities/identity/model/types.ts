export const IDENTITY_SECTIONS = [
  "vision",
  "values",
  "standards",
  "archetypes",
  "narrative",
  "emotional-patterns",
  "strengths-weaknesses",
  "interests",
  "beliefs",
  "boundaries",
  "life-domains",
  "goals",
] as const;

export type IdentitySection = (typeof IDENTITY_SECTIONS)[number];

/** Section-specific fields. Goals use targetDate (yyyy-mm-dd) and done. */
export type IdentityEntryExtras = {
  targetDate?: string | null;
  done?: boolean;
};

export type IdentityEntry = {
  id: string;
  section: IdentitySection;
  title: string;
  body: string | null;
  extras: IdentityEntryExtras;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateIdentityEntryInput = {
  section: IdentitySection;
  title: string;
  body?: string | null;
  extras?: IdentityEntryExtras;
};

export type UpdateIdentityEntryInput = {
  title?: string;
  body?: string | null;
  extras?: IdentityEntryExtras;
};

export type ReorderIdentityEntriesInput = {
  section: IdentitySection;
  ids: string[];
};
