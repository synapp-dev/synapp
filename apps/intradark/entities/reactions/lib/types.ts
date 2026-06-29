import type { ReactionType } from "./constants";

/**
 * Minimal identity used to render a commenter/reactor name, avatar, and the
 * hovercard. Assembled once at query time so the UI never re-fetches per row.
 * Mirrors the joins already used by player-profile comments (user_profiles →
 * steam_profiles → players).
 */
export type ReactionAuthor = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  countryFlag: string | null;
  steamid64: string | null;
};

/** A single reaction with its author, as shown in the details dialog. */
export type ReactionView = {
  userId: string;
  reactType: ReactionType;
  createdAt: string;
  author: ReactionAuthor;
};

/** The display name we fall back through: displayName → persona → @username. */
export function authorName(author: ReactionAuthor): string {
  return (
    author.displayName?.trim() ||
    author.username?.trim() ||
    "Player"
  );
}

/**
 * Canonical player-profile link for an author. Members resolve to `@username`;
 * otherwise the steamid64 route. Returns null when neither is known (the name
 * then renders without a link / hovercard CTA).
 */
export function authorProfileHref(author: ReactionAuthor): string | null {
  if (author.username) return `/players/@${author.username}`;
  if (author.steamid64) return `/players/${author.steamid64}`;
  return null;
}
