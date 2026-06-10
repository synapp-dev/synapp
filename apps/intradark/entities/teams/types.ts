/** Lightweight team row for lists, switcher, and cards. */
export type TeamSummary = {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
};

export type TeamRow = TeamSummary & {
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
