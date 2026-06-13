import { describe, expect, it } from "vitest";
import { buildRawItemDedupeKey, normalizeRawDescription } from "@/server/supplier-raw-items/normalize-raw-description";
import { evaluateInventorySetupProgress } from "@/server/inventory-setup/inventory-setup-progress";

describe("normalizeRawDescription", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeRawDescription("  Box of Tomatoes — 10 kg  ")).toBe(
      "box of tomatoes — 10 kg",
    );
  });
});

describe("buildRawItemDedupeKey", () => {
  it("combines supplier id and normalised description", () => {
    expect(buildRawItemDedupeKey("supplier-1", "Box Tomatoes")).toBe(
      "supplier-1:box tomatoes",
    );
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
      posImportRan: true,
      inUseMenuItemCount: 3,
      mappedInUseCount: 3,
      storageLocationCount: 0,
    });
    expect(progress.steps.find((s) => s.id === "pos_items")?.status).toBe("complete");
    expect(progress.currentStep).toBe("pos_items");
  });
});
