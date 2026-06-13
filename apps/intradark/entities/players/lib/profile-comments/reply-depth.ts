import { PLAYER_PROFILE_MAX_COMMENT_DEPTH } from "./constants";

export type CommentParentRow = {
  id: string;
  parentCommentId: string | null;
};

export function commentDepthFromParentMap(
  commentId: string,
  byId: Map<string, CommentParentRow>,
): number {
  let depth = 0;
  let current = byId.get(commentId);
  if (!current) return -1;
  const seen = new Set<string>();
  while (current.parentCommentId != null) {
    if (seen.has(current.id)) return -1;
    seen.add(current.id);
    const parent = byId.get(current.parentCommentId);
    if (!parent) break;
    depth += 1;
    current = parent;
    if (depth > PLAYER_PROFILE_MAX_COMMENT_DEPTH + 5) {
      return PLAYER_PROFILE_MAX_COMMENT_DEPTH + 99;
    }
  }
  return depth;
}

export function depthAfterNewChild(
  parentCommentId: string | null | undefined,
  byId: Map<string, CommentParentRow>,
): number {
  if (parentCommentId == null) return 0;
  const d = commentDepthFromParentMap(parentCommentId, byId);
  if (d < 0) return -1;
  return d + 1;
}

export function exceedsMaxCommentDepth(depth: number): boolean {
  return depth > PLAYER_PROFILE_MAX_COMMENT_DEPTH;
}
