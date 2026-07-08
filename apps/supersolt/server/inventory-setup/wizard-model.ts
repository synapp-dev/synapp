import type { InventorySetupProgress } from "@/server/inventory-setup/inventory-setup-progress";

/**
 * Pure mapper that composes the four narrated wizard stages from the derived
 * {@link InventorySetupProgress} (data-backed completion) and the persisted
 * wizard acknowledgement state (intro-seen + confirmation-only sub-steps).
 *
 * Completion stays derived wherever data can express it; only confirmation
 * sub-steps read from {@link InventorySetupWizardState}. Locking is computed
 * honestly here — the dev-unlock bypass is a UI concern applied client-side.
 *
 * See apps/supersolt/docs/features/inventory-setup/setup-wizard/plan.md §5.
 */

export type InventorySetupWizardStageId =
  | "suppliers"
  | "inventory"
  | "products"
  | "storage";

export type WizardAck = { at: string; by: string };

export type InventorySetupWizardState = {
  /** True once the user has watched the one-time superbot welcome intro. */
  welcomeSeen: boolean;
  introSeen: string[];
  stageAcks: Record<string, WizardAck>;
  subStepAcks: Record<string, WizardAck>;
};

export const EMPTY_WIZARD_STATE: InventorySetupWizardState = {
  welcomeSeen: false,
  introSeen: [],
  stageAcks: {},
  subStepAcks: {},
};

/** Stable ack keys persisted in venues.inventory_setup_wizard_state.subStepAcks. */
export const WIZARD_ACK_KEYS = {
  inventoryBatchesDone: "inventory.batchesDone",
  inventoryMasterListReviewed: "inventory.masterListReviewed",
  productsModifiersConfirmed: "products.modifiersConfirmed",
  productsConfirmed: "products.confirmed",
} as const;

export type WizardAckKey =
  (typeof WIZARD_ACK_KEYS)[keyof typeof WIZARD_ACK_KEYS];

export const WIZARD_ACK_KEY_VALUES: readonly string[] =
  Object.values(WIZARD_ACK_KEYS);

export const WIZARD_STAGE_IDS: readonly InventorySetupWizardStageId[] = [
  "suppliers",
  "inventory",
  "products",
  "storage",
];

export type WizardSubStepStatusKind = "derived" | "ack";

export type WizardSubStep = {
  key: string;
  label: string;
  kind: WizardSubStepStatusKind;
  complete: boolean;
  locked: boolean;
  lockReason: string | null;
  /** Scoped path suffix for buildScopedPath, or null for confirm-only steps. */
  deepLink: string | null;
  stale: boolean;
  staleCount: number;
};

export type WizardStageStatus = "complete" | "current" | "locked";

export type WizardStage = {
  id: InventorySetupWizardStageId;
  label: string;
  status: WizardStageStatus;
  introSeen: boolean;
  complete: boolean;
  subSteps: WizardSubStep[];
};

export type InventorySetupWizardModel = {
  stages: WizardStage[];
  currentStageId: InventorySetupWizardStageId;
  allComplete: boolean;
  /** Whether the one-time superbot welcome intro has been watched. */
  welcomeSeen: boolean;
};

const SECTION = {
  suppliers: "settings/inventory-setup/suppliers",
  normalise: "settings/inventory-setup/inventory",
  masterList: "settings/inventory-setup/inventory/master-list",
  posItems: "settings/inventory-setup/products",
  recipes: "settings/inventory-setup/products/recipes",
  storage: "settings/inventory-setup/storage",
} as const;

type SubStepSpec = {
  key: string;
  label: string;
  kind: WizardSubStepStatusKind;
  deepLink: string | null;
  complete: (p: InventorySetupProgress["counts"], acks: Set<string>) => boolean;
  /** Within-stage prerequisite (in addition to the stage being unlocked). */
  prereqComplete?: (
    p: InventorySetupProgress["counts"],
    acks: Set<string>,
  ) => boolean;
  prereqLockReason?: string;
  staleness?: (p: InventorySetupProgress) => { stale: boolean; count: number };
};

type StageSpec = {
  id: InventorySetupWizardStageId;
  label: string;
  lockReason: string;
  subSteps: SubStepSpec[];
};

const STAGE_SPECS: StageSpec[] = [
  {
    id: "suppliers",
    label: "Suppliers",
    lockReason: "",
    subSteps: [
      {
        key: "suppliers.added",
        label: "Add your suppliers",
        kind: "derived",
        deepLink: SECTION.suppliers,
        complete: (p) => p.supplierCount >= 1,
      },
      {
        key: "suppliers.items",
        label: "Add supplier items from invoices",
        kind: "derived",
        deepLink: SECTION.suppliers,
        complete: (p) => p.rawItemCount >= 1,
        prereqComplete: (p) => p.supplierCount >= 1,
        prereqLockReason: "Add at least one supplier first",
      },
      {
        // Per-supplier, not venue-global: every inventory supplier must have
        // its items triaged AND yield ≥1 inventory item, or be consciously
        // parked as "no catalog yet". An empty kept supplier blocks here
        // instead of passing silently. Pricing happens later, at normalisation.
        key: "suppliers.approved",
        label: "Check items for every supplier",
        kind: "derived",
        deepLink: SECTION.suppliers,
        complete: (p) =>
          p.rawItemCount >= 1 && p.unresolvedInventorySupplierCount === 0,
        prereqComplete: (p) => p.rawItemCount >= 1,
        prereqLockReason: "Add supplier items first",
      },
      {
        key: "suppliers.ready",
        label: "Get a supplier order-ready",
        kind: "derived",
        deepLink: SECTION.suppliers,
        complete: (p) => p.readySupplierCount >= 1,
        prereqComplete: (p) => p.supplierCount >= 1,
        prereqLockReason: "Add at least one supplier first",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    lockReason: "Complete the Suppliers stage first",
    subSteps: [
      {
        key: "inventory.normalised",
        label: "Turn supplier items into trackable ingredients",
        kind: "derived",
        deepLink: SECTION.normalise,
        complete: (p) => p.rawItemCount >= 1 && p.pendingRawItemCount === 0,
      },
      {
        key: WIZARD_ACK_KEYS.inventoryBatchesDone,
        label: "Create your batches (or confirm you have none)",
        kind: "ack",
        deepLink: SECTION.recipes,
        complete: (_p, acks) => acks.has(WIZARD_ACK_KEYS.inventoryBatchesDone),
        prereqComplete: (p) => p.rawItemCount >= 1 && p.pendingRawItemCount === 0,
        prereqLockReason: "Normalise your items first",
      },
      {
        key: WIZARD_ACK_KEYS.inventoryMasterListReviewed,
        label: "Review your master inventory list",
        kind: "ack",
        deepLink: SECTION.masterList,
        complete: (_p, acks) =>
          acks.has(WIZARD_ACK_KEYS.inventoryMasterListReviewed),
        prereqComplete: (p) => p.rawItemCount >= 1 && p.pendingRawItemCount === 0,
        prereqLockReason: "Normalise your items first",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    lockReason: "Complete the Inventory stage first",
    subSteps: [
      {
        key: "products.imported",
        label: "Import your POS items from Square",
        kind: "derived",
        deepLink: SECTION.posItems,
        complete: (p) => p.posImportRan,
      },
      {
        key: WIZARD_ACK_KEYS.productsModifiersConfirmed,
        label: "Check your modifiers are correct",
        kind: "ack",
        deepLink: SECTION.posItems,
        complete: (_p, acks) =>
          acks.has(WIZARD_ACK_KEYS.productsModifiersConfirmed),
        prereqComplete: (p) => p.posImportRan,
        prereqLockReason: "Import your POS items first",
      },
      {
        key: "products.mapped",
        label: "Add a recipe for every product you sell",
        kind: "derived",
        deepLink: SECTION.posItems,
        complete: (p) =>
          p.posImportRan &&
          (p.inUseMenuItemCount === 0 ||
            p.mappedInUseCount >= p.inUseMenuItemCount),
        prereqComplete: (p) => p.posImportRan,
        prereqLockReason: "Import your POS items first",
      },
      {
        key: WIZARD_ACK_KEYS.productsConfirmed,
        label: "Confirm your products",
        kind: "ack",
        deepLink: null,
        complete: (_p, acks) => acks.has(WIZARD_ACK_KEYS.productsConfirmed),
        prereqComplete: (p, acks) =>
          p.posImportRan &&
          acks.has(WIZARD_ACK_KEYS.productsModifiersConfirmed) &&
          (p.inUseMenuItemCount === 0 ||
            p.mappedInUseCount >= p.inUseMenuItemCount),
        prereqLockReason: "Finish modifiers and recipes first",
      },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    lockReason: "Complete the Products stage first",
    subSteps: [
      {
        key: "storage.added",
        label: "Add the places you store stock",
        kind: "derived",
        deepLink: SECTION.storage,
        complete: (p) => p.storageLocationCount >= 1,
      },
    ],
  },
];

export function buildWizardModel(
  progress: InventorySetupProgress,
  wizardState: InventorySetupWizardState = EMPTY_WIZARD_STATE,
): InventorySetupWizardModel {
  const counts = progress.counts;
  const acks = new Set(Object.keys(wizardState.subStepAcks ?? {}));
  const introSeen = new Set(wizardState.introSeen ?? []);

  // First pass: compute each stage's intrinsic completion (all sub-steps done).
  const stageComplete = new Map<InventorySetupWizardStageId, boolean>();
  for (const spec of STAGE_SPECS) {
    stageComplete.set(
      spec.id,
      spec.subSteps.every((s) => s.complete(counts, acks)),
    );
  }

  // A stage is unlocked when the previous stage is complete.
  let prevComplete = true;
  const stageUnlocked = new Map<InventorySetupWizardStageId, boolean>();
  for (const spec of STAGE_SPECS) {
    stageUnlocked.set(spec.id, prevComplete);
    prevComplete = prevComplete && (stageComplete.get(spec.id) ?? false);
  }

  let currentAssigned = false;
  const stages: WizardStage[] = STAGE_SPECS.map((spec) => {
    const complete = stageComplete.get(spec.id) ?? false;
    const unlocked = stageUnlocked.get(spec.id) ?? false;

    let status: WizardStageStatus;
    if (complete) {
      status = "complete";
    } else if (unlocked && !currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else {
      status = "locked";
    }

    const subSteps: WizardSubStep[] = spec.subSteps.map((s) => {
      const isComplete = s.complete(counts, acks);
      const prereqMet = s.prereqComplete
        ? s.prereqComplete(counts, acks)
        : true;
      const locked = !unlocked || !prereqMet;
      const lockReason = !unlocked
        ? spec.lockReason
        : !prereqMet
          ? (s.prereqLockReason ?? null)
          : null;
      const staleness =
        s.staleness && isComplete ? s.staleness(progress) : null;
      return {
        key: s.key,
        label: s.label,
        kind: s.kind,
        complete: isComplete,
        locked,
        lockReason: locked ? lockReason : null,
        deepLink: s.deepLink,
        stale: staleness?.stale ?? false,
        staleCount: staleness?.stale ? staleness.count : 0,
      };
    });

    return {
      id: spec.id,
      label: spec.label,
      status,
      introSeen: introSeen.has(spec.id),
      complete,
      subSteps,
    };
  });

  const current = stages.find((s) => s.status === "current");
  const allComplete = stages.every((s) => s.complete);
  const currentStageId: InventorySetupWizardStageId = current
    ? current.id
    : "storage";

  return {
    stages,
    currentStageId,
    allComplete,
    welcomeSeen: wizardState.welcomeSeen ?? false,
  };
}

export type WizardStatePatch = {
  markWelcomeSeen?: boolean;
  markIntroSeen?: string;
  setStageAck?: { stage: string; value: boolean };
  setSubStepAck?: { key: string; value: boolean };
};

/**
 * Pure, idempotent reducer applied to the persisted wizard state. Preserves
 * existing keys; setting a `false` value removes the ack.
 */
export function applyWizardStatePatch(
  state: InventorySetupWizardState,
  patch: WizardStatePatch,
  stamp: WizardAck,
): InventorySetupWizardState {
  const next: InventorySetupWizardState = {
    welcomeSeen: state.welcomeSeen ?? false,
    introSeen: [...(state.introSeen ?? [])],
    stageAcks: { ...(state.stageAcks ?? {}) },
    subStepAcks: { ...(state.subStepAcks ?? {}) },
  };

  if (patch.markWelcomeSeen !== undefined) {
    next.welcomeSeen = patch.markWelcomeSeen;
  }

  if (patch.markIntroSeen && !next.introSeen.includes(patch.markIntroSeen)) {
    next.introSeen.push(patch.markIntroSeen);
  }

  if (patch.setStageAck) {
    if (patch.setStageAck.value) {
      next.stageAcks[patch.setStageAck.stage] = stamp;
    } else {
      delete next.stageAcks[patch.setStageAck.stage];
    }
  }

  if (patch.setSubStepAck) {
    if (patch.setSubStepAck.value) {
      next.subStepAcks[patch.setSubStepAck.key] = stamp;
    } else {
      delete next.subStepAcks[patch.setSubStepAck.key];
    }
  }

  return next;
}
