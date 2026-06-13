import type { PoStatus } from "./purchase-orders.repo";

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

export type UpsertPoLineInput = {
  id?: string;
  supplierProductId?: string | null;
  ingredientId?: string | null;
  productName: string;
  quantityOrdered: number;
  unitPriceCents: number;
  notes?: string | null;
};

export type CreatePurchaseOrderInput = {
  supplierId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  lines: UpsertPoLineInput[];
};

export type ReceivePurchaseOrderInput = {
  lines: Array<{
    lineId: string;
    quantityReceived: number;
    outstandingResolution?: "expect_later" | "cancel_remainder" | "credit_owed" | null;
    overReceiptResolution?: "accept_pay" | "accept_gift" | "reject_extras" | null;
  }>;
  notes?: string | null;
};
