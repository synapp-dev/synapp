import { describe, expect, it } from "vitest";
import {
  countUniqueProducts,
  descriptionsLikelySameProduct,
  findSimilarPendingRawItems,
} from "@/server/inventory-normalisation/find-similar-pending-raw-items";

describe("descriptionsLikelySameProduct", () => {
  it("matches prefix variants from the same supplier line", () => {
    expect(
      descriptionsLikelySameProduct(
        "Breast Fillet Skin Off 18 HCM",
        "Breast Fillet Skin Off 18 HCM 200 Pieces @160g",
      ),
    ).toBe(true);
  });

  it("does not match unrelated products", () => {
    expect(
      descriptionsLikelySameProduct("Breast Fillet Skin Off 18 HCM", "Beef Mince"),
    ).toBe(false);
  });

  it("ignores asterisk brand-marker runs", () => {
    expect(
      descriptionsLikelySameProduct(
        "ALMOND MILK **** MILK LAB **** 1lt x 8pk",
        "ALMOND MILK MILK LAB 1lt x 8pk",
      ),
    ).toBe(true);
  });

  it("ignores brace origin/brand tags", () => {
    expect(
      descriptionsLikelySameProduct(
        "BACON TIBALDI SHORT **** RINDLESS **** 5kg {Tibaldi}",
        "BACON TIBALDI SHORT RINDLESS 5kg",
      ),
    ).toBe(true);
    expect(
      descriptionsLikelySameProduct(
        "BREAD FOCACCIA PLAIN GLUTEN FREE 10 x 180gm {Senza}",
        "BREAD FOCACCIA PLAIN GLUTEN FREE 10 x 180gm",
      ),
    ).toBe(true);
  });

  it("still separates different products after stripping decoration", () => {
    expect(
      descriptionsLikelySameProduct(
        "ALMOND MILK **** MILK LAB **** 1lt x 8pk",
        "SOY MILK **** MILK LAB **** 1lt x 8pk",
      ),
    ).toBe(false);
  });

  it("ignores punctuation drift mid-description", () => {
    // Live case: same cling wrap invoiced once as "W/ DISPENSER" and once as
    // "W/-DISPENSER" — a stray hyphen shouldn't split one product into two.
    expect(
      descriptionsLikelySameProduct(
        "45CM X 600MTR CLING WRAP W/ DISPENSER",
        "45CM X 600MTR CLING WRAP W/-DISPENSER",
      ),
    ).toBe(true);
  });

  it("matches a trailing unit hint in parens even below the shared-prefix floor", () => {
    // Live case: "Garlic Oil" is only 10 chars — under MIN_SHARED_PREFIX_LENGTH
    // — so it'd never fold with an extension on plain prefix length. But
    // "(l)" is just a unit hint, not new product info, so strip it first.
    expect(descriptionsLikelySameProduct("Garlic Oil", "Garlic Oil (l)")).toBe(
      true,
    );
  });

  it("ignores a trailing pack-format hint in parens", () => {
    // Live case: one invoice line adds a stray period, the other doesn't —
    // both should fold once the "(Tins)" pack hint is stripped either way.
    expect(
      descriptionsLikelySameProduct(
        "ARZ Peppers - Roasted (Tins)",
        "ARZ Peppers - Roasted. (Tins)",
      ),
    ).toBe(true);
  });

  it("does not strip parenthesised content that isn't a known unit word", () => {
    // "(Mild)" and "(Hot)" can be genuinely different products — only known
    // unit/pack words in parens are decoration.
    expect(
      descriptionsLikelySameProduct("Sopressa (Mild)", "Sopressa (Hot)"),
    ).toBe(false);
  });

  describe("typo tier", () => {
    const a = "PICCOLO PANINI BAR **PTD GRASEPROOF PAPER CUT 2 425X330MM / 1000 SHEETS PER CTN";
    const b = "PICCOLO PANINI BAR **PTD GREASEPROOF PAPER CUT 2 425X330MM / 1000 SHEETS PER CTN";
    // Same product, no asterisks, "GREASE PROOF" split into two words — a
    // third real invoice variant of the same live case.
    const c = "PICCOLO PANINI BAR PTD GREASE PROOF PAPER CUT 2 425X330MM / 1000 SHEETS PER CTN";

    it("matches a one-letter typo at the same price", () => {
      expect(descriptionsLikelySameProduct(a, b, 6990, 6990)).toBe(true);
    });

    it("matches a stray inserted space at the same price", () => {
      expect(descriptionsLikelySameProduct(b, c, 6990, 6990)).toBe(true);
    });

    it("does not match without price info", () => {
      // No corroborating price means text similarity alone isn't trusted.
      expect(descriptionsLikelySameProduct(a, b)).toBe(false);
    });

    it("does not match when prices diverge", () => {
      // Same near-identical text, but the price gate should block it — a
      // meaningfully different price means this probably isn't a typo.
      expect(descriptionsLikelySameProduct(a, b, 6990, 9990)).toBe(false);
    });

    it("does not fuzzy-match short descriptions even at the same price", () => {
      // Below FUZZY_MIN_LENGTH — short strings need the exact/prefix tiers,
      // not typo tolerance, or "Milk" could match too much by coincidence.
      expect(descriptionsLikelySameProduct("Milk 2L", "Malk 2L", 500, 500)).toBe(
        false,
      );
    });

    it("does not match a meaningfully different product regardless of price", () => {
      // "Skin Off" vs "Skin On" is 2 edits — over FUZZY_MAX_DISTANCE — so it
      // stays separate even if priced the same.
      expect(
        descriptionsLikelySameProduct(
          "Chicken Breast Fillet Skin Off 5kg Fresh",
          "Chicken Breast Fillet Skin On 5kg Fresh",
          1200,
          1200,
        ),
      ).toBe(false);
    });
  });
});

describe("findSimilarPendingRawItems", () => {
  const candidates = [
    {
      id: "a",
      supplierId: "oroso",
      rawDescription: "Breast Fillet Skin Off 18 HCM",
      lastUnitPriceCents: 1200,
      normalisationStatus: "pending",
    },
    {
      id: "b",
      supplierId: "oroso",
      rawDescription: "Breast Fillet Skin Off 18 HCM 200 Pieces @160g",
      lastUnitPriceCents: 1200,
      normalisationStatus: "pending",
    },
    {
      id: "c",
      supplierId: "oroso",
      rawDescription: "Beef Mince",
      lastUnitPriceCents: 1200,
      normalisationStatus: "pending",
    },
    {
      id: "d",
      supplierId: "morabito",
      rawDescription: "Breast Fillet Skin Off 18 HCM",
      lastUnitPriceCents: 1200,
      normalisationStatus: "pending",
    },
  ];

  it("finds the paired breast fillet lines at the same price", () => {
    const similar = findSimilarPendingRawItems(candidates[0]!, candidates);
    expect(similar).toHaveLength(1);
    expect(similar[0]?.id).toBe("b");
  });

  it("ignores same wording from another supplier", () => {
    const similar = findSimilarPendingRawItems(candidates[3]!, candidates);
    expect(similar).toHaveLength(0);
  });

  it("still matches when unit price differs — different pack size, same product", () => {
    // e.g. "EGGS - 600g 15DOZEN" box $39.55 vs pack $36.16: raw items are
    // unique on (supplier, description, unit), so a price difference means a
    // different pack, not a different product.
    const similar = findSimilarPendingRawItems(
      {
        id: "x",
        supplierId: "oroso",
        rawDescription: "Breast Fillet Skin Off 18 HCM",
        lastUnitPriceCents: 1500,
        normalisationStatus: "pending",
      },
      candidates,
    );
    expect(similar.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("countUniqueProducts", () => {
  // Most cases here don't care about price — wrap plain descriptions so the
  // fuzzy tier simply never engages (it requires both prices present).
  const items = (descriptions: string[]) =>
    descriptions.map((description) => ({ description }));

  it("returns 0 for no descriptions", () => {
    expect(countUniqueProducts([])).toBe(0);
  });

  it("counts identical unit-variant rows as one product", () => {
    // The live EGGS case: multiple raw rows, same description, different
    // raw_unit (box/dozen/pack/each).
    expect(
      countUniqueProducts(
        items([
          "EGGS - 600g {49's} 15DOZEN {SUNEGGS}",
          "EGGS - 600g {49's} 15DOZEN {SUNEGGS}",
          "EGGS - 600g {49's} 15DOZEN {SUNEGGS}",
          "EGGS - 600g {49's} 15DOZEN {SUNEGGS}",
        ]),
      ),
    ).toBe(1);
  });

  it("folds prefix-extension wording drift onto one product", () => {
    expect(
      countUniqueProducts(
        items([
          "Breast Fillet Skin Off 18 HCM",
          "Breast Fillet Skin Off 18 HCM 200 Pieces @160g",
        ]),
      ),
    ).toBe(1);
  });

  it("ignores brand-brace and asterisk decoration", () => {
    expect(
      countUniqueProducts(
        items([
          "ALMOND MILK **** MILK LAB **** 1lt x 8pk",
          "ALMOND MILK MILK LAB 1lt x 8pk",
        ]),
      ),
    ).toBe(1);
  });

  it("keeps genuinely different products apart", () => {
    expect(
      countUniqueProducts(
        items(["Tomatoes Roma 5kg", "Basil Bunch", "Mozzarella Fior di Latte 2kg"]),
      ),
    ).toBe(3);
  });

  it("does not fold on short shared prefixes", () => {
    // Under the 12-char shared-prefix floor: "Eggs" is a prefix of the longer
    // row but far too short to assert same-product.
    expect(countUniqueProducts(items(["Eggs", "Eggs Benedict Mix 2kg"]))).toBe(2);
  });

  it("folds transitively through a chain of extensions", () => {
    expect(
      countUniqueProducts(
        items([
          "Sopressa Mild Whole",
          "Sopressa Mild Whole ~3.5kg",
          "Sopressa Mild Whole ~3.5kg RW {ARZ}",
        ]),
      ),
    ).toBe(1);
  });

  it("folds a typo at the same price via the fuzzy tier", () => {
    // Live case: "PICCOLO PANINI BAR **PTD GRASEPROOF PAPER CUT 2 425X330MM /
    // 1000 SHEETS…" (missing an "E") vs the correctly-spelled version, both
    // $69.90.
    expect(
      countUniqueProducts([
        {
          description:
            "PICCOLO PANINI BAR **PTD GRASEPROOF PAPER CUT 2 425X330MM / 1000 SHEETS PER CTN",
          priceCents: 6990,
        },
        {
          description:
            "PICCOLO PANINI BAR **PTD GREASEPROOF PAPER CUT 2 425X330MM / 1000 SHEETS PER CTN",
          priceCents: 6990,
        },
      ]),
    ).toBe(1);
  });
});
