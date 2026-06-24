/**
 * Atomic navigation capability slugs — seeded in `public.roles` (see drizzle `0016_*`).
 */
export const NAV_SLUG = {
  NEWS: "nav.news",
  FORUMS: "nav.forums",
  MEDIA: "nav.media",
  TEAMS: "nav.teams",
  PLAYERS: "nav.players",
  THEORY: "nav.theory",
  UTILITY: "nav.utility",
  SCRIMS: "nav.scrims",
  TOURNAMENTS: "nav.tournaments",
  DASHBOARD: "nav.dashboard",
  SERVER: "nav.server",
  MATCHES: "nav.matches",
  MATCH: "nav.match",
  CREW: "nav.crew",
  POSITIONS: "nav.positions",
} as const;

/** First URL segment → required capability slug (top-level routes only). */
export const SEGMENT_TO_NAV_SLUG: Record<string, string> = {
  news: NAV_SLUG.NEWS,
  forums: NAV_SLUG.FORUMS,
  media: NAV_SLUG.MEDIA,
  teams: NAV_SLUG.TEAMS,
  players: NAV_SLUG.PLAYERS,
  theory: NAV_SLUG.THEORY,
  utility: NAV_SLUG.UTILITY,
  scrims: NAV_SLUG.SCRIMS,
  tournaments: NAV_SLUG.TOURNAMENTS,
  dashboard: NAV_SLUG.DASHBOARD,
  matches: NAV_SLUG.MATCHES,
  match: NAV_SLUG.MATCH,
  crew: NAV_SLUG.CREW,
  positions: NAV_SLUG.POSITIONS,
};

/**
 * Anonymous visitors: no DB row — same slug strings as seeded `roles` rows for consistency.
 */
export const NAV_ANONYMOUS_SLUGS: readonly string[] = [
  NAV_SLUG.NEWS,
  NAV_SLUG.FORUMS,
  NAV_SLUG.MEDIA,
  NAV_SLUG.TEAMS,
  NAV_SLUG.PLAYERS,
  NAV_SLUG.THEORY,
  NAV_SLUG.UTILITY,
];

export const ROLE_TEMPLATE_MEMBER_SLUG = "member" as const;
