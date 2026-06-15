export type InventorySetupStepId = "suppliers" | "raw_items" | "normalise" | "pos_items";

export type InventorySetupStepStatus = "pending" | "complete" | "locked";

export type InventorySetupStep = {
  id: InventorySetupStepId;
  label: string;
  status: InventorySetupStepStatus;
};

// --- Wizard model (mirrors server/inventory-setup/wizard-model.ts) ---

export type InventorySetupWizardStageId =
  | "suppliers"
  | "inventory"
  | "products"
  | "storage";

export type WizardSubStepStatusKind = "derived" | "ack";

export type WizardSubStep = {
  key: string;
  label: string;
  kind: WizardSubStepStatusKind;
  complete: boolean;
  locked: boolean;
  lockReason: string | null;
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
  welcomeSeen: boolean;
};

export type WizardAck = { at: string; by: string };

export type InventorySetupWizardState = {
  welcomeSeen: boolean;
  introSeen: string[];
  stageAcks: Record<string, WizardAck>;
  subStepAcks: Record<string, WizardAck>;
};

export type WizardStatePatchInput = {
  markWelcomeSeen?: boolean;
  markIntroSeen?: InventorySetupWizardStageId;
  setStageAck?: { stage: InventorySetupWizardStageId; value: boolean };
  setSubStepAck?: { key: string; value: boolean };
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
  wizard: InventorySetupWizardModel;
};

/** Supplier shown in the import dialog's inventory-source picker. */
export type SelectableSupplier = {
  id: string;
  name: string;
  isInventorySource: boolean;
};

/**
 * Interim job result while parked at the selection gate. Mirrors the server
 * type; the picker reads `selectableSuppliers`.
 */
export type InventorySetupImportGateState = {
  stage: "awaiting_selection";
  suppliers: { created: number; updated: number; skipped: number; errors: string[] };
  selectableSuppliers: SelectableSupplier[];
};

export type InventorySetupImportResult = {
  suppliers: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  invoices: {
    synced: number;
    parsedFromAttachment: number;
    parseFailed: Array<{ invoiceId: string; reason: string }>;
  };
  rawItems: { upserted: number; skipped: number };
  deliverySuggestions: { suppliersSuggested: number };
  error: string | null;
};

export type InventorySetupRestartResult = {
  suppliersRemoved: number;
  invoicesRemoved: number;
  rawItemsRemoved: number;
  purchaseOrdersRemoved: number;
  menuItemsRemoved: number;
  importJobsRemoved: number;
};
