import { FORUM_MAX_REPLY_DEPTH } from "./constants";

export type ReplyParentRow = { id: string; parentReplyId: string | null };

/**
 * Depth of `replyId` within a thread: root reply = 0. Returns -1 if reply not in map.
 */
export function replyDepthFromParentMap(
  replyId: string,
  byId: Map<string, ReplyParentRow>,
): number {
  let depth = 0;
  let current = byId.get(replyId);
  if (!current) return -1;
  const seen = new Set<string>();
  while (current.parentReplyId != null) {
    if (seen.has(current.id)) return -1;
    seen.add(current.id);
    const parent = byId.get(current.parentReplyId);
    if (!parent) break;
    depth += 1;
    current = parent;
    if (depth > FORUM_MAX_REPLY_DEPTH + 5) return FORUM_MAX_REPLY_DEPTH + 99;
  }
  return depth;
}

/** Depth a *new* child under `parentReplyId` would have (parent depth + 1). Root = 0. */
export function depthAfterNewChild(
  parentReplyId: string | null | undefined,
  byId: Map<string, ReplyParentRow>,
): number {
  if (parentReplyId == null) return 0;
  const d = replyDepthFromParentMap(parentReplyId, byId);
  if (d < 0) return -1;
  return d + 1;
}

export function exceedsMaxReplyDepth(depth: number): boolean {
  return depth > FORUM_MAX_REPLY_DEPTH;
}
