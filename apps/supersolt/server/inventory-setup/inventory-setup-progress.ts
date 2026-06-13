export type InventorySetupStepId =
  | "suppliers"
  | "raw_items"
  | "normalise"
  | "pos_items";

export type InventorySetupStepStatus = "pending" | "complete" | "locked";

export type InventorySetupStep = {
  id: InventorySetupStepId;
  label: string;
  status: InventorySetupStepStatus;
};

export type InventorySetupProgress = {
  phase1Complete: boolean;
  phase2Complete: boolean;
  hasNewPendingSinceComplete: boolean;
  currentStep: InventorySetupStepId;
  steps: InventorySetupStep[];
  counts: {
    supplierCount: number;
    rawItemCount: number;
    pendingRawItemCount: number;
    normalisedRawItemCount: number;
    skippedRawItemCount: number;
    posImportRan: boolean;
    inUseMenuItemCount: number;
    mappedInUseCount: number;
    storageLocationCount: number;
  };
};

export function evaluateInventorySetupProgress(args: {
  supplierCount: number;
  rawItemCount: number;
  pendingRawItemCount: number;
  normalisedRawItemCount: number;
  skippedRawItemCount: number;
  posImportRan: boolean;
  inUseMenuItemCount: number;
  mappedInUseCount: number;
  storageLocationCount: number;
}): InventorySetupProgress {
  const suppliersComplete = args.supplierCount >= 1;
  const rawItemsComplete = args.rawItemCount >= 1;
  const phase1Complete = suppliersComplete && rawItemsComplete;
  const phase2Complete = phase1Complete && args.pendingRawItemCount === 0 && args.rawItemCount >= 1;
  const hasNewPendingSinceComplete =
    phase1Complete && args.pendingRawItemCount > 0 && args.normalisedRawItemCount + args.skippedRawItemCount > 0;

  const posMappingComplete =
    args.posImportRan &&
    (args.inUseMenuItemCount === 0 || args.mappedInUseCount >= args.inUseMenuItemCount);

  const normaliseStatus: InventorySetupStepStatus = !phase1Complete
    ? "locked"
    : phase2Complete
      ? "complete"
      : "pending";

  const posStatus: InventorySetupStepStatus = !phase2Complete
    ? "locked"
    : posMappingComplete
      ? "complete"
      : "pending";

  const steps: InventorySetupStep[] = [
    {
      id: "suppliers",
      label: "Suppliers",
      status: suppliersComplete ? "complete" : "pending",
    },
    {
      id: "raw_items",
      label: "Raw items",
      status: rawItemsComplete ? "complete" : suppliersComplete ? "pending" : "locked",
    },
    {
      id: "normalise",
      label: "Normalise",
      status: normaliseStatus,
    },
    {
      id: "pos_items",
      label: "POS items",
      status: posStatus,
    },
  ];

  let currentStep: InventorySetupStepId = "suppliers";
  if (!suppliersComplete) {
    currentStep = "suppliers";
  } else if (!rawItemsComplete) {
    currentStep = "raw_items";
  } else if (!phase2Complete) {
    currentStep = "normalise";
  } else if (!posMappingComplete) {
    currentStep = "pos_items";
  } else {
    currentStep = "pos_items";
  }

  return {
    phase1Complete,
    phase2Complete,
    hasNewPendingSinceComplete,
    currentStep,
    steps,
    counts: {
      supplierCount: args.supplierCount,
      rawItemCount: args.rawItemCount,
      pendingRawItemCount: args.pendingRawItemCount,
      normalisedRawItemCount: args.normalisedRawItemCount,
      skippedRawItemCount: args.skippedRawItemCount,
      posImportRan: args.posImportRan,
      inUseMenuItemCount: args.inUseMenuItemCount,
      mappedInUseCount: args.mappedInUseCount,
      storageLocationCount: args.storageLocationCount,
    },
  };
}
