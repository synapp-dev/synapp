/**
 * Emoji reaction vocabulary, ported from the Landmark comment UX. One reaction
 * per user per target; clicking the active one removes it, a different one
 * replaces it. Order here is the order shown in the picker and summary cluster.
 */
export const REACTION_TYPES = ["like", "love", "laugh", "fire", "sad"] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  fire: "🔥",
  sad: "😢",
};

export function isReactionType(value: string): value is ReactionType {
  return (REACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Every surface a reaction can attach to. Comments use the row id; entity-level
 * reactions (the article/profile/thread itself) use that entity's natural key
 * (uuid, or steamid64 for player profiles).
 */
export const REACTION_TARGET_TYPES = [
  "player_comment",
  "player_profile",
  "news_comment",
  "news_article",
  "forum_reply",
  "forum_thread",
] as const;

export type ReactionTargetType = (typeof REACTION_TARGET_TYPES)[number];

export function isReactionTargetType(
  value: string,
): value is ReactionTargetType {
  return (REACTION_TARGET_TYPES as readonly string[]).includes(value);
}
