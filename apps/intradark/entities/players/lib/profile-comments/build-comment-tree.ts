import type { ProfileTrustSignal } from "./constants";

export type ProfileCommentFlat = {
  id: string;
  subjectSteamid64: string;
  parentCommentId: string | null;
  body: string;
  authorUserId: string;
  trustSignal: ProfileTrustSignal | null;
  createdAt: string;
  updatedAt: string;
  authorUsername: string | null;
  authorAvatar: string | null;
};

export type ProfileCommentTreeNode = ProfileCommentFlat & {
  children: ProfileCommentTreeNode[];
};

/**
 * Builds nested trees from a flat list. Replies sort oldest-first; caller
 * should pass top-level roots already sorted newest-first.
 */
export function buildCommentTree(
  comments: ProfileCommentFlat[],
): ProfileCommentTreeNode[] {
  const byId = new Map<string, ProfileCommentFlat>();
  for (const c of comments) {
    byId.set(c.id, c);
  }

  const sorted = [...comments].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const mutable = new Map<
    string,
    ProfileCommentTreeNode & { _parentId: string | null }
  >();

  for (const c of sorted) {
    const parentOk =
      c.parentCommentId != null && byId.has(c.parentCommentId);
    const effectiveParentId = parentOk ? c.parentCommentId : null;
    mutable.set(c.id, {
      ...c,
      children: [],
      _parentId: effectiveParentId,
    });
  }

  const roots: ProfileCommentTreeNode[] = [];

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
