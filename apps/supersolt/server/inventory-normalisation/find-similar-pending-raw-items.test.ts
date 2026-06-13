import { describe, expect, it } from "vitest";
import {
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

  it("ignores same supplier when unit price differs", () => {
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
    expect(similar).toHaveLength(0);
  });
});
