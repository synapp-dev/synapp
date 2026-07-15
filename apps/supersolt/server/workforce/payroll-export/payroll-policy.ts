export type PayRunStatus =
  | "draft"
  | "returned_for_revision"
  | "pending_owner_approval"
  | "approved"
  | "xero_push_pending"
  | "sent_to_xero"
  | "finalised_in_xero"
  | "paid"
  | "payslips_issued"
  | "stp_lodged"
  | "super_scheduled"
  | "super_paid"
  | "reconciled";

const EDITABLE_STATUSES: PayRunStatus[] = ["draft", "returned_for_revision"];

const STATUS_TRANSITIONS: Record<PayRunStatus, PayRunStatus[]> = {
  draft: ["pending_owner_approval"],
  returned_for_revision: ["pending_owner_approval"],
  pending_owner_approval: ["approved", "returned_for_revision"],
  approved: ["sent_to_xero", "xero_push_pending"],
  xero_push_pending: ["sent_to_xero", "approved"],
  sent_to_xero: ["finalised_in_xero"],
  finalised_in_xero: ["paid"],
  paid: ["payslips_issued"],
  payslips_issued: ["stp_lodged"],
  stp_lodged: ["super_scheduled"],
  super_scheduled: ["super_paid"],
  super_paid: ["reconciled"],
  reconciled: [],
};

export function canTransitionPayRunStatus(from: PayRunStatus, to: PayRunStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canEditLineItem(status: PayRunStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export type PayRunLineItemDto = {
  id: string;
  userProfileId: string;
  staffName: string;
  hoursTotal: number;
  grossCents: number;
  superCents: number;
  paygCents: number;
  netCents: number;
  hasOverrides: boolean;
  hasFdvLeave: boolean;
  fdvPayslipLabel?: string | null;
  hoursBreakdown?: Record<string, unknown>;
  isTermination: boolean;
};

export function stripFdvFromLineItemDto(
  line: PayRunLineItemDto,
  includeFdv: boolean,
): PayRunLineItemDto {
  if (includeFdv) return line;
  return { ...line, hasFdvLeave: false, fdvPayslipLabel: null };
}

export function isPayRunLocked(status: PayRunStatus): boolean {
  return !EDITABLE_STATUSES.includes(status) && status !== "pending_owner_approval";
}
