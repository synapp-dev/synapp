export type ForumReplyFlat = {
  id: string;
  threadId: string;
  parentReplyId: string | null;
  body: string;
  authorUserId: string;
  createdAt: string;
  /** Display name from profile join; may be null. */
  authorDisplayName: string | null;
  authorUsername: string | null;
};

export type ForumReplyTreeNode = ForumReplyFlat & {
  children: ForumReplyTreeNode[];
};

/**
 * Sorts by `createdAt` ascending, then builds a forest of roots (`parent_reply_id` null)
 * with nested `children`. Rows whose parent is missing in the list become roots (orphan lift).
 */
export function buildReplyTree(replies: ForumReplyFlat[]): ForumReplyTreeNode[] {
  const byId = new Map<string, ForumReplyFlat>();
  for (const r of replies) {
    byId.set(r.id, r);
  }

  const sorted = [...replies].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const mutable = new Map<
    string,
    ForumReplyTreeNode & { _parentId: string | null }
  >();

  for (const r of sorted) {
    const parentOk =
      r.parentReplyId != null && byId.has(r.parentReplyId);
    const effectiveParentId = parentOk ? r.parentReplyId : null;

    mutable.set(r.id, {
      ...r,
      children: [],
      _parentId: effectiveParentId,
    });
  }

  const roots: ForumReplyTreeNode[] = [];

  for (const node of mutable.values()) {
    const pid = node._parentId;
    delete (node as { _parentId?: string })._parentId;
    if (pid == null) {
      roots.push(node);
      continue;
    }
    const parent = mutable.get(pid);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
