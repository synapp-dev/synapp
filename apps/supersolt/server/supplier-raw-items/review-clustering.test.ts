import { describe, expect, it } from "vitest";

import {
  clusterRawItems,
  packSignatureForDescription,
  parsePack,
  type ClusterableRawItem,
} from "@/server/supplier-raw-items/review-clustering";

function rawItem(overrides: Partial<ClusterableRawItem> & { rawDescription: string }): ClusterableRawItem {
  return {
    id: overrides.id ?? overrides.rawDescription,
    rawDescription: overrides.rawDescription,
    rawDescriptionNormalized:
      overrides.rawDescriptionNormalized ?? overrides.rawDescription.trim().toLowerCase(),
    rawUnit: overrides.rawUnit ?? null,
    rawUnitNormalized: overrides.rawUnitNormalized ?? "",
    lastUnitPriceCents: overrides.lastUnitPriceCents ?? null,
    lastSeenAt: overrides.lastSeenAt ?? "2026-01-01T00:00:00Z",
    isLikelyInventory: overrides.isLikelyInventory ?? true,
    reviewedAt: overrides.reviewedAt ?? null,
  };
}

describe("parsePack", () => {
  it("parses a plain weight", () => {
    const p = parsePack("SPREAD PISTACHIO 5kg");
    expect(p.coreName).toBe("SPREAD PISTACHIO");
    expect(p.magnitude).toBe(5);
    expect(p.uom).toBe("kg");
    expect(p.packCount).toBeNull();
  });

  it("parses a multipack with parenthesised count and strips brace tags", () => {
    const p = parsePack("PESTO BASIL 1.9kg (6) {Sandhurst}");
    expect(p.coreName).toBe("PESTO BASIL");
    expect(p.magnitude).toBe(1.9);
    expect(p.uom).toBe("kg");
    expect(p.packCount).toBe(6);
  });

  it("parses '1lt x 8' and strips asterisk runs", () => {
    const p = parsePack("MILK SOY **** MILKLAB **** 1lt x 8");
    expect(p.coreTokens).toEqual(["milk", "soy", "milklab"]);
    expect(p.magnitude).toBe(1);
    expect(p.uom).toBe("lt");
    expect(p.packCount).toBe(8);
  });
});

describe("clusterRawItems", () => {
  it("merges a typo and a pk/unit split into one product with one pack", () => {
    const products = clusterRawItems([
      rawItem({ rawDescription: "SPREAD PISTACHIO 5kg", rawUnit: "pk", lastUnitPriceCents: 9027, lastSeenAt: "2026-02-01" }),
      rawItem({ rawDescription: "SPREAD PISTACCHIO 5kg", rawUnit: "unit", lastUnitPriceCents: 9050, lastSeenAt: "2026-03-01" }),
    ]);

    expect(products).toHaveLength(1);
    const product = products[0]!;
    expect(product.aliases).toHaveLength(2);
    expect(product.packs).toHaveLength(1);
    // Most recent observation wins the displayed price.
    expect(product.currentPriceCents).toBe(9050);
    expect(product.packs[0]!.label).toBe("5kg");
  });

  it("keeps genuinely different products apart (soy vs oat)", () => {
    const products = clusterRawItems([
      rawItem({ rawDescription: "MILK SOY **** MILKLAB **** 1lt x 8" }),
      rawItem({ rawDescription: "MILK OAT **** MILKLAB **** 1lt x 8" }),
    ]);
    expect(products).toHaveLength(2);
  });

  it("collapses identical descriptions and lists distinct packs", () => {
    const products = clusterRawItems([
      rawItem({ rawDescription: "LEMON JUICE 2lt (6) {Edlyn}", lastSeenAt: "2026-01-01" }),
      rawItem({ rawDescription: "LEMON JUICE 5lt {Edlyn}", lastSeenAt: "2026-02-01" }),
    ]);
    expect(products).toHaveLength(1);
    const labels = products[0]!.packs.map((p) => p.label).sort();
    expect(labels).toEqual(["2lt × 6", "5lt"]);
  });
});

describe("packSignatureForDescription", () => {
  it("matches wording-drift twins (identical description, unit drifted on invoices)", () => {
    expect(
      packSignatureForDescription("EGGS - 600g {49's} 15DOZEN {SUNEGGS}"),
    ).toBe(packSignatureForDescription("EGGS - 600g {49's} 15DOZEN {SUNEGGS}"));
  });

  it("ignores brand decoration (asterisks and braces)", () => {
    expect(
      packSignatureForDescription("ALMOND MILK **** MILK LAB **** 1lt x 8pk"),
    ).toBe(packSignatureForDescription("ALMOND MILK MILK LAB 1lt x 8pk"));
  });

  it("separates genuinely different packs", () => {
    expect(
      packSignatureForDescription("LEMON JUICE 2lt (6)"),
    ).not.toBe(packSignatureForDescription("LEMON JUICE 5lt"));
    expect(
      packSignatureForDescription("COKE GLASS BOTTLES 330ml x 24"),
    ).not.toBe(packSignatureForDescription("COKE GLASS BOTTLES 330ml x 12"));
  });
});
