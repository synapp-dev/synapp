import { describe, expect, it } from "vitest";

import type { NormalisationQueueItem } from "@/entities/inventory-normalisation/model/types";
import { groupQueueItemVariants } from "./group-queue-item-variants";

function queueItem(
  overrides: Partial<NormalisationQueueItem> & { id: string },
): NormalisationQueueItem {
  return {
    supplierId: "sup-1",
    supplierName: "ARZ Food Service",
    rawDescription: `Item ${overrides.id}`,
    rawUnit: null,
    lastQuantity: null,
    lastUnitPriceCents: null,
    lastLineTotalCents: null,
    source: "invoice_parse",
    normalisationStatus: "pending",
    supplierProductId: null,
    lastSeenAt: "2026-07-01T00:00:00Z",
    bucket: "main",
    similarPendingItems: [],
    ...overrides,
  };
}

function similar(item: NormalisationQueueItem) {
  return {
    id: item.id,
    rawDescription: item.rawDescription,
    lastUnitPriceCents: item.lastUnitPriceCents,
  };
}

describe("groupQueueItemVariants", () => {
  it("keeps unlinked items as singleton groups in input order", () => {
    const a = queueItem({ id: "a" });
    const b = queueItem({ id: "b" });

    const groups = groupQueueItemVariants([a, b]);

    expect(groups).toEqual([
      { representative: a, variants: [a] },
      { representative: b, variants: [b] },
    ]);
  });

  it("groups unit variants linked via similarPendingItems, rep = shortest description", () => {
    const pk = queueItem({
      id: "pk",
      rawDescription: "ALMOND MILK **** MILK LAB **** 1lt x 8pk",
      rawUnit: "pk",
      lastUnitPriceCents: 2821,
    });
    const pack = queueItem({
      id: "pack",
      rawDescription: "ALMOND MILK **** MILK LAB **** 1lt x 8pk",
      rawUnit: "pack",
      lastUnitPriceCents: 2821,
    });
    const short = queueItem({
      id: "short",
      rawDescription: "ALMOND MILK MILK LAB 1lt x 8pk",
      rawUnit: "pk",
      lastUnitPriceCents: 2821,
    });
    pk.similarPendingItems = [similar(pack), similar(short)];
    pack.similarPendingItems = [similar(pk), similar(short)];
    short.similarPendingItems = [similar(pk), similar(pack)];
    const other = queueItem({ id: "other", rawDescription: "BALSAMIC GLAZE 500ml (6)" });

    const groups = groupQueueItemVariants([pk, pack, short, other]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.representative).toBe(short);
    expect(groups[0]?.variants).toEqual([pk, pack, short]);
    expect(groups[1]).toEqual({ representative: other, variants: [other] });
  });

  it("merges transitive links into one component", () => {
    // a links to b, b links to c — all three are one product.
    const a = queueItem({ id: "a", rawDescription: "BACON TIBALDI SHORT RINDLESS 5kg X" });
    const b = queueItem({ id: "b", rawDescription: "BACON TIBALDI SHORT RINDLESS 5kg" });
    const c = queueItem({ id: "c", rawDescription: "BACON TIBALDI SHORT **** RINDLESS **** 5kg" });
    a.similarPendingItems = [similar(b)];
    b.similarPendingItems = [similar(a), similar(c)];
    c.similarPendingItems = [similar(b)];

    const groups = groupQueueItemVariants([a, b, c]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.representative).toBe(b);
    expect(groups[0]?.variants).toEqual([a, b, c]);
  });

  it("ignores links to items outside the list (other bucket or filtered out)", () => {
    const shown = queueItem({ id: "shown" });
    shown.similarPendingItems = [
      { id: "hidden", rawDescription: "HIDDEN ITEM", lastUnitPriceCents: null },
    ];

    const groups = groupQueueItemVariants([shown]);

    expect(groups).toEqual([{ representative: shown, variants: [shown] }]);
  });

  it("handles an empty list", () => {
    expect(groupQueueItemVariants([])).toEqual([]);
  });
});
