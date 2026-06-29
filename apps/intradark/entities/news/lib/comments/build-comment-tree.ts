export type NewsCommentFlat = {
  id: string;
  articleId: string;
  parentCommentId: string | null;
  body: string;
  authorUserId: string;
  createdAt: string;
  updatedAt: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  authorCountryFlag: string | null;
  authorSteamid64: string | null;
};

export type NewsCommentTreeNode = NewsCommentFlat & {
  children: NewsCommentTreeNode[];
};

/**
 * Builds nested trees from a flat list. Replies sort oldest-first; caller
 * should pass top-level roots already sorted newest-first.
 */
export function buildNewsCommentTree(
  comments: NewsCommentFlat[],
): NewsCommentTreeNode[] {
  const byId = new Map<string, NewsCommentFlat>();
  for (const c of comments) {
    byId.set(c.id, c);
  }

  const sorted = [...comments].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const mutable = new Map<
    string,
    NewsCommentTreeNode & { _parentId: string | null }
  >();

  for (const c of sorted) {
    const parentOk = c.parentCommentId != null && byId.has(c.parentCommentId);
    const effectiveParentId = parentOk ? c.parentCommentId : null;
    mutable.set(c.id, {
      ...c,
      children: [],
      _parentId: effectiveParentId,
    });
  }

  const roots: NewsCommentTreeNode[] = [];

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

/** Flattens every comment id in a forest (roots + all descendants). */
export function collectNewsCommentIds(
  trees: NewsCommentTreeNode[],
): string[] {
  const ids: string[] = [];
  const walk = (node: NewsCommentTreeNode) => {
    ids.push(node.id);
    for (const child of node.children) walk(child);
  };
  for (const tree of trees) walk(tree);
  return ids;
}
