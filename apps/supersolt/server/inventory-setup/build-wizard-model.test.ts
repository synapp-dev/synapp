import { describe, expect, it } from "vitest";
import { evaluateInventorySetupProgress } from "@/server/inventory-setup/inventory-setup-progress";
import {
  applyWizardStatePatch,
  buildWizardModel,
  EMPTY_WIZARD_STATE,
  WIZARD_ACK_KEYS,
  type InventorySetupWizardState,
} from "@/server/inventory-setup/wizard-model";

const ZERO_COUNTS = {
  supplierCount: 0,
  rawItemCount: 0,
  pendingRawItemCount: 0,
  normalisedRawItemCount: 0,
  skippedRawItemCount: 0,
  posImportRan: false,
  inUseMenuItemCount: 0,
  mappedInUseCount: 0,
  storageLocationCount: 0,
};

function progress(overrides: Partial<typeof ZERO_COUNTS> = {}) {
  return evaluateInventorySetupProgress({ ...ZERO_COUNTS, ...overrides });
}

function stateWith(
  acks: string[],
  introSeen: string[] = [],
): InventorySetupWizardState {
  return {
    welcomeSeen: false,
    introSeen,
    stageAcks: {},
    subStepAcks: Object.fromEntries(
      acks.map((k) => [k, { at: "2026-06-13T00:00:00.000Z", by: "u1" }]),
    ),
  };
}

describe("buildWizardModel", () => {
  it("returns four stages in order", () => {
    const model = buildWizardModel(progress(), EMPTY_WIZARD_STATE);
    expect(model.stages.map((s) => s.id)).toEqual([
      "suppliers",
      "inventory",
      "products",
      "storage",
    ]);
  });

  it("starts with Suppliers current and later stages locked on a fresh venue", () => {
    const model = buildWizardModel(progress(), EMPTY_WIZARD_STATE);
    expect(model.currentStageId).toBe("suppliers");
    expect(model.stages[0]?.status).toBe("current");
    expect(model.stages[1]?.status).toBe("locked");
    expect(model.stages[3]?.status).toBe("locked");
    expect(model.allComplete).toBe(false);
  });

  it("locks raw-items sub-step with a reason until a supplier exists", () => {
    const model = buildWizardModel(progress(), EMPTY_WIZARD_STATE);
    const rawItems = model.stages[0]?.subSteps.find(
      (s) => s.key === "suppliers.items",
    );
    expect(rawItems?.locked).toBe(true);
    expect(rawItems?.lockReason).toBe("Add at least one supplier first");
  });

  it("completes Suppliers only when items added AND non-inventory filtered (ack)", () => {
    const withoutAck = buildWizardModel(
      progress({ supplierCount: 2, rawItemCount: 5 }),
      EMPTY_WIZARD_STATE,
    );
    expect(withoutAck.stages[0]?.complete).toBe(false);

    const withAck = buildWizardModel(
      progress({ supplierCount: 2, rawItemCount: 5 }),
      stateWith([WIZARD_ACK_KEYS.suppliersNonInventoryFiltered]),
    );
    expect(withAck.stages[0]?.complete).toBe(true);
    expect(withAck.stages[1]?.status).toBe("current");
  });

  it("treats inUseMenuItemCount === 0 as a satisfied mapping sub-step", () => {
    const model = buildWizardModel(
      progress({
        supplierCount: 1,
        rawItemCount: 1,
        posImportRan: true,
        inUseMenuItemCount: 0,
        mappedInUseCount: 0,
      }),
      stateWith([
        WIZARD_ACK_KEYS.suppliersNonInventoryFiltered,
        WIZARD_ACK_KEYS.inventoryBatchesDone,
        WIZARD_ACK_KEYS.inventoryMasterListReviewed,
      ]),
    );
    const mapped = model.stages[2]?.subSteps.find(
      (s) => s.key === "products.mapped",
    );
    expect(mapped?.complete).toBe(true);
  });

  it("marks an ack sub-step stale (but stage stays complete) when pending raw items reappear", () => {
    const p = progress({
      supplierCount: 1,
      rawItemCount: 5,
      pendingRawItemCount: 3,
      normalisedRawItemCount: 2,
    });
    expect(p.hasNewPendingSinceComplete).toBe(true);
    const model = buildWizardModel(
      p,
      stateWith([WIZARD_ACK_KEYS.suppliersNonInventoryFiltered]),
    );
    const filter = model.stages[0]?.subSteps.find(
      (s) => s.key === WIZARD_ACK_KEYS.suppliersNonInventoryFiltered,
    );
    expect(filter?.complete).toBe(true);
    expect(filter?.stale).toBe(true);
    expect(filter?.staleCount).toBe(3);
  });

  it("reports introSeen from persisted state", () => {
    const model = buildWizardModel(progress(), stateWith([], ["suppliers"]));
    expect(model.stages[0]?.introSeen).toBe(true);
    expect(model.stages[1]?.introSeen).toBe(false);
  });
});

describe("applyWizardStatePatch", () => {
  const stamp = { at: "2026-06-13T01:00:00.000Z", by: "u9" };

  it("adds intro-seen idempotently", () => {
    const once = applyWizardStatePatch(
      EMPTY_WIZARD_STATE,
      { markIntroSeen: "suppliers" },
      stamp,
    );
    const twice = applyWizardStatePatch(once, { markIntroSeen: "suppliers" }, stamp);
    expect(twice.introSeen).toEqual(["suppliers"]);
  });

  it("sets and clears a sub-step ack without dropping other keys", () => {
    const set = applyWizardStatePatch(
      stateWith([WIZARD_ACK_KEYS.inventoryBatchesDone]),
      { setSubStepAck: { key: WIZARD_ACK_KEYS.productsConfirmed, value: true } },
      stamp,
    );
    expect(set.subStepAcks[WIZARD_ACK_KEYS.productsConfirmed]).toEqual(stamp);
    expect(set.subStepAcks[WIZARD_ACK_KEYS.inventoryBatchesDone]).toBeDefined();

    const cleared = applyWizardStatePatch(
      set,
      { setSubStepAck: { key: WIZARD_ACK_KEYS.productsConfirmed, value: false } },
      stamp,
    );
    expect(cleared.subStepAcks[WIZARD_ACK_KEYS.productsConfirmed]).toBeUndefined();
  });

  it("does not mutate the input state", () => {
    const input = stateWith([WIZARD_ACK_KEYS.inventoryBatchesDone]);
    applyWizardStatePatch(
      input,
      { setStageAck: { stage: "inventory", value: true } },
      stamp,
    );
    expect(input.stageAcks).toEqual({});
  });

  it("sets and clears the one-time welcomeSeen flag", () => {
    const seen = applyWizardStatePatch(
      EMPTY_WIZARD_STATE,
      { markWelcomeSeen: true },
      stamp,
    );
    expect(seen.welcomeSeen).toBe(true);
    const reset = applyWizardStatePatch(seen, { markWelcomeSeen: false }, stamp);
    expect(reset.welcomeSeen).toBe(false);
  });
});

describe("buildWizardModel welcomeSeen", () => {
  it("defaults welcomeSeen to false on empty state", () => {
    expect(buildWizardModel(progress(), EMPTY_WIZARD_STATE).welcomeSeen).toBe(
      false,
    );
  });

  it("surfaces a persisted welcomeSeen flag", () => {
    const model = buildWizardModel(progress(), {
      ...EMPTY_WIZARD_STATE,
      welcomeSeen: true,
    });
    expect(model.welcomeSeen).toBe(true);
  });
});
