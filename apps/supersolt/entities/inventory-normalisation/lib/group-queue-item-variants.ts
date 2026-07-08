import type { NormalisationQueueItem } from "@/entities/inventory-normalisation/model/types";

/**
 * One product with its unit-size variants in the normalisation queue. The
 * representative (shortest description, mirroring groupSimilarRawItems) heads
 * the accordion row; `variants` includes the representative itself.
 */
export type QueueItemVariantGroup = {
  representative: NormalisationQueueItem;
  variants: NormalisationQueueItem[];
};

/**
 * Groups queue items that are the same product in different unit sizes, using
 * the already-attached `similarPendingItems` links (same supplier + aligned
 * price + same-product description — the exact relation the old "Similar (N)"
 * chip displayed) as edges of connected components. Links pointing at items not
 * in `items` (other bucket / filtered out) are ignored, so a group never
 * references a row the table isn't showing. Group order follows the input
 * order of each group's first item; variants keep input order too.
 */
export function groupQueueItemVariants(
  items: NormalisationQueueItem[],
): QueueItemVariantGroup[] {
  const indexById = new Map(items.map((item, index) => [item.id, index]));

  // Union-find over item indexes.
  const parent = items.map((_, index) => index);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    // Path compression.
    let cursor = i;
    while (parent[cursor] !== root) {
      const next = parent[cursor]!;
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  items.forEach((item, index) => {
    for (const similar of item.similarPendingItems ?? []) {
      const otherIndex = indexById.get(similar.id);
      if (otherIndex != null) union(index, otherIndex);
    }
  });

  const groupsByRoot = new Map<number, NormalisationQueueItem[]>();
  items.forEach((item, index) => {
    const root = find(index);
    const members = groupsByRoot.get(root);
    if (members) {
      members.push(item);
    } else {
      groupsByRoot.set(root, [item]);
    }
  });

  return [...groupsByRoot.values()].map((variants) => {
    let representative = variants[0]!;
    for (const variant of variants) {
      if (variant.rawDescription.length < representative.rawDescription.length) {
        representative = variant;
      }
    }
    return { representative, variants };
  });
}
