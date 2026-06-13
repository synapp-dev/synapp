export type PoStatus =
  | "draft"
  | "pending_approval"
  | "submitted"
  | "confirmed"
  | "delivered"
  | "closed"
  | "cancelled";

export type PurchaseOrderLineDto = {
  id: string;
  supplierProductId: string | null;
  ingredientId: string | null;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPriceCents: number;
  subtotalCents: number;
  notes: string | null;
  isOutstanding: boolean;
  outstandingResolution: string | null;
  expectedDeliveryDate: string | null;
};

export type PurchaseOrderSummaryDto = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PoStatus;
  expectedDeliveryDate: string | null;
  subtotalCents: number;
  totalCents: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  approvalStatus: string | null;
};

export type PurchaseOrderDetailDto = PurchaseOrderSummaryDto & {
  gstCents: number;
  gstTreatment: string;
  notes: string | null;
  partialDeliveryFlag: boolean;
  actualDeliveryDate: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  approvalComment: string | null;
  linkedInvoiceId: string | null;
  lines: PurchaseOrderLineDto[];
  allowedActions: string[];
  emails: Array<{
    id: string;
    direction: string;
    subject: string;
    sentAt: string | null;
    toAddress: string;
  }>;
  audit: Array<{
    id: string;
    eventType: string;
    changedAt: string;
    beforeValue: unknown;
    afterValue: unknown;
  }>;
  receivingEvents: Array<{
    id: string;
    receivedAt: string;
    notes: string | null;
    quantitiesReceived: Record<string, number>;
  }>;
};

export type PurchaseOrderListResponse = {
  orders: PurchaseOrderSummaryDto[];
  statusCounts: Record<string, number>;
};

export type OrderGuidePeriodPreset = "3d" | "7d" | "14d" | "custom";

export type OrderGuideSuggestionBreakdown = {
  forecastedDemandBaseUnits: number;
  currentStockBaseUnits: number;
  pendingDeliveriesBaseUnits: number;
  bufferPercent: number;
  bufferAddedBaseUnits: number;
  needBaseUnits: number;
  packLabel: string;
  unitsPerPack: number;
  packUnit: string;
  suggestedPackQuantity: number;
  assumptions: string[];
};

export type OrderGuideSuggestion = {
  ingredientId: string;
  ingredientName: string;
  supplierId: string;
  supplierName: string;
  supplierProductId: string;
  supplierProductName: string;
  unitPriceCents: number;
  suggestedPackQuantity: number;
  suggestedSubtotalCents: number;
  breakdown: OrderGuideSuggestionBreakdown;
};

export type OrderGuideResponse = {
  computedAt: string | null;
  forecastReady: boolean;
  forecastHorizonDays: number;
  periodPreset: OrderGuidePeriodPreset;
  coldStart: boolean;
  stockCountMissing: boolean;
  noSupplierProducts: boolean;
  suggestionsBySupplier: Array<{
    supplierId: string;
    supplierName: string;
    orderingEmail: string | null;
    leadTimeDays: number;
    minimumOrderCents: number;
    subtotalCents: number;
    belowMinimum: boolean;
    minimumShortfallCents: number;
    lines: OrderGuideSuggestion[];
  }>;
  meta: {
    defaultBufferPercent: number;
    revenueForecastCents: number;
  };
};
