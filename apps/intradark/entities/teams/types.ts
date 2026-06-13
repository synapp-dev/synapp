/** Player's membership on a team (for profile header, roster rows, etc.). */
export type PlayerTeamMembership = {
  team: TeamSummary;
  role: string;
};

/** Lightweight team row for lists, switcher, and cards. */
export type TeamSummary = {
  id: string;
  name: string;
  slug: string;
  /** Public URL for display (legacy URLs pass through). */
  avatar: string | null;
  /** Hex brand colour for profile header glow (e.g. `#00497d`). */
  primaryColor: string | null;
  /** Hex brand colour for profile header border and team name (e.g. `#0483c8`). */
  secondaryColor: string | null;
};

export type TeamRow = TeamSummary & {
  /** Storage object path in `intradark-media`, e.g. `avatars/teams/{id}/….png`. */
  avatarObjectPath: string | null;
  nickname: string | null;
  description: string | null;
  coverImage: string | null;
  leaderSteamid64: string | null;
  game: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamRosterMember = {
  steamid64: string;
  role: string;
  joinedAt: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  profileHref: string;
};
