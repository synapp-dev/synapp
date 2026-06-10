/** Route segments under /teams — must not be used as team slugs. */
export const TEAM_RESERVED_SLUGS = new Set([
  "new",
  "home",
  "upcoming",
  "admin",
]);
