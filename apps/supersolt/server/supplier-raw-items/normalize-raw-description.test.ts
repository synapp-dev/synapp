import { describe, expect, it } from "vitest";
import {
  buildRawItemDedupeKey,
  normalizeRawDescription,
  normalizeRawUnit,
} from "@/server/supplier-raw-items/normalize-raw-description";
import { evaluateInventorySetupProgress } from "@/server/inventory-setup/inventory-setup-progress";

describe("normalizeRawDescription", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeRawDescription("  Box of Tomatoes — 10 kg  ")).toBe(
      "box of tomatoes — 10 kg",
    );
  });
});

describe("buildRawItemDedupeKey", () => {
  it("combines supplier id, normalised description and unit", () => {
    expect(buildRawItemDedupeKey("supplier-1", "Box Tomatoes")).toBe(
      "supplier-1:box tomatoes:",
    );
  });

  it("distinguishes the same product priced under different packs", () => {
    const each = buildRawItemDedupeKey("supplier-1", "Continental Cucumber", "each");
    const bag = buildRawItemDedupeKey("supplier-1", "Continental Cucumber", "bag");
    expect(each).toBe("supplier-1:continental cucumber:each");
    expect(bag).toBe("supplier-1:continental cucumber:bag");
    expect(each).not.toBe(bag);
  });

  it("merges a product split only by a description-echoing unit", () => {
    // "Focaccia - Slab" billed once as "slab" and once as "units" is one product.
    const slab = buildRawItemDedupeKey("supplier-1", "Focaccia - Slab", "slab");
    const units = buildRawItemDedupeKey("supplier-1", "Focaccia - Slab", "units");
    expect(slab).toBe(units);
    expect(slab).toBe("supplier-1:focaccia - slab:each");
  });
});

describe("normalizeRawUnit", () => {
  it("collapses generic count words to a canonical 'each'", () => {
    expect(normalizeRawUnit("units")).toBe("each");
    expect(normalizeRawUnit("EA")).toBe("each");
    expect(normalizeRawUnit("piece")).toBe("each");
  });

  it("leaves a missing unit empty, distinct from an explicit each", () => {
    expect(normalizeRawUnit(null)).toBe("");
    expect(normalizeRawUnit("  ")).toBe("");
  });

  it("keeps real pack and measure units", () => {
    expect(normalizeRawUnit("bag")).toBe("bag");
    expect(normalizeRawUnit("KG")).toBe("kg");
    expect(normalizeRawUnit("carton")).toBe("carton");
  });

  it("treats a unit that echoes the description as a plain count", () => {
    expect(normalizeRawUnit("slab", "Focaccia - Slab")).toBe("each");
  });

  it("does not collapse a real pack unit even when it echoes the description", () => {
    expect(normalizeRawUnit("bag", "Bag of Apples")).toBe("bag");
  });

  it("does not treat a measure value as an echo", () => {
    expect(normalizeRawUnit("2l", "Milk 2L")).toBe("2l");
  });
});

describe("evaluateInventorySetupProgress", () => {
  it("starts on suppliers when empty", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 0,
      rawItemCount: 0,
      pendingRawItemCount: 0,
      normalisedRawItemCount: 0,
      skippedRawItemCount: 0,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: false,
      inUseMenuItemCount: 0,
      mappedInUseCount: 0,
      storageLocationCount: 0,
    });
    expect(progress.currentStep).toBe("suppliers");
    expect(progress.phase1Complete).toBe(false);
  });

  it("marks phase 1 complete and unlocks normalise when pending remain", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 2,
      rawItemCount: 5,
      pendingRawItemCount: 3,
      normalisedRawItemCount: 1,
      skippedRawItemCount: 1,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: false,
      inUseMenuItemCount: 0,
      mappedInUseCount: 0,
      storageLocationCount: 0,
    });
    expect(progress.phase1Complete).toBe(true);
    expect(progress.phase2Complete).toBe(false);
    expect(progress.steps.find((s) => s.id === "normalise")?.status).toBe("pending");
    expect(progress.currentStep).toBe("normalise");
  });

  it("marks phase 2 complete when no pending raw items", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 2,
      rawItemCount: 5,
      pendingRawItemCount: 0,
      normalisedRawItemCount: 4,
      skippedRawItemCount: 1,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: false,
      inUseMenuItemCount: 0,
      mappedInUseCount: 0,
      storageLocationCount: 0,
    });
    expect(progress.phase2Complete).toBe(true);
    expect(progress.steps.find((s) => s.id === "normalise")?.status).toBe("complete");
  });

  it("sets hasNewPendingSinceComplete when items were actioned then new pending appear", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 1,
      rawItemCount: 3,
      pendingRawItemCount: 1,
      normalisedRawItemCount: 2,
      skippedRawItemCount: 0,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: false,
      inUseMenuItemCount: 0,
      mappedInUseCount: 0,
      storageLocationCount: 0,
    });
    expect(progress.hasNewPendingSinceComplete).toBe(true);
    expect(progress.phase2Complete).toBe(false);
  });

  it("locks POS step until phase 2 complete", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 2,
      rawItemCount: 5,
      pendingRawItemCount: 1,
      normalisedRawItemCount: 3,
      skippedRawItemCount: 1,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: false,
      inUseMenuItemCount: 0,
      mappedInUseCount: 0,
      storageLocationCount: 0,
    });
    expect(progress.steps.find((s) => s.id === "pos_items")?.status).toBe("locked");
  });

  it("completes POS step when in-use lines are mapped", () => {
    const progress = evaluateInventorySetupProgress({
      supplierCount: 2,
      rawItemCount: 5,
      pendingRawItemCount: 0,
      normalisedRawItemCount: 5,
      skippedRawItemCount: 0,
      unreviewedRawItemCount: 0,
      readySupplierCount: 0,
      posImportRan: true,
      inUseMenuItemCount: 3,
      mappedInUseCount: 3,
      storageLocationCount: 0,
    });
    expect(progress.steps.find((s) => s.id === "pos_items")?.status).toBe("complete");
    expect(progress.currentStep).toBe("pos_items");
  });
});
