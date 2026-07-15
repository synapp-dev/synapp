import type { StockCountStatus } from "./stock-counts-policy";

export type StockCountScopeType = "full" | "location" | "cycle" | "category";

export type StockCountSummaryDto = {
  id: string;
  name: string;
  status: StockCountStatus;
  scopeType: StockCountScopeType;
  assigneeUserId: string | null;
  itemCount: number;
  completedItemCount: number;
  totalVarianceCents: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  allowedActions: string[];
};

export type StockCountEntryDto = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  category: string;
  locationId: string | null;
  previousCountQty: number | null;
  expectedQty: number | null;
  countedQty: number | null;
  unitUsed: string | null;
  mixedUnitBreakdown: unknown;
  varianceQty: number | null;
  varianceCents: number | null;
  notes: string | null;
  photoUrls: string[];
  unitsPerPack: number | null;
  packLabel: string | null;
  needsVerification: boolean;
  isRecountRequired: boolean;
  isSkipped: boolean;
  isRowComplete: boolean;
  countedAt: string | null;
};

export type StorageLocationDto = {
  id: string;
  name: string;
  displayOrder: number;
};

export type StockCountDetailDto = StockCountSummaryDto & {
  scopeFilter: Record<string, unknown>;
  isBaseline: boolean;
  largeVarianceOwnerRequired: boolean;
  notes: string | null;
  rejectionReason: string | null;
  startedAt: string | null;
  entries: StockCountEntryDto[];
  locations: StorageLocationDto[];
};

export type StockCountListResponse = {
  counts: StockCountSummaryDto[];
  lastApprovedAt: string | null;
  daysSinceLastCount: number | null;
  activeIngredientCount: number;
};

export type CreateStockCountInput = {
  name?: string;
  scopeType?: StockCountScopeType;
  scopeFilter?: Record<string, unknown>;
  assigneeUserId?: string | null;
  templateId?: string | null;
};

export type UpsertStockCountEntryInput = {
  ingredientId: string;
  locationId?: string | null;
  countedQty?: number | null;
  unitUsed?: string | null;
  mixedUnitBreakdown?: unknown;
  notes?: string | null;
  needsVerification?: boolean;
  isRowComplete?: boolean;
  isSkipped?: boolean;
};

export type PatchStockCountInput = {
  entries?: UpsertStockCountEntryInput[];
  notes?: string;
};

export type StockCountActionInput = {
  rejectionReason?: string;
  entryIdsForRecount?: string[];
  confirmBulkZero?: boolean;
  reopenReason?: string;
};
