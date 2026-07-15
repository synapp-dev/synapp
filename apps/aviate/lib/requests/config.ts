/**
 * Request-type registry.
 *
 * Every one of the station's paper forms is one `request_kind`. This file is
 * the single source of truth for each kind's label, the approval chain that
 * gets materialised into `request_approvals` at submit time, the human
 * reference prefix, and whether the form has a built UI yet (`live`) or is
 * still on the roadmap. Adding a new form is a config entry + a form component,
 * not a schema change.
 */

import type { Enums } from "@/types/supabase";

export type RequestKind = Enums<"request_kind">;
export type ApprovalRole = Enums<"approval_role">;
export type RequestStatus = Enums<"request_status">;
export type ApprovalDecision = Enums<"approval_decision">;

export type ApprovalStepDef = {
  role: ApprovalRole;
  label: string;
  /**
   * When true the step is actioned by a specific named employee carried in the
   * request payload (the swap counterparty), not by any role-holder.
   */
  assigneeFromPayload?: "requesteeEmployeeId";
};

export type RequestKindConfig = {
  kind: RequestKind;
  label: string;
  /** One-liner describing the real-world form this replaces. */
  description: string;
  /** Original Menzies PDF this digitises. */
  paperForm: string;
  /** lucide-react icon name, mapped to a component in the UI. */
  icon: string;
  /** Semantic accent tone keyed into REQUEST_ACCENT. */
  accent: RequestAccent;
  /** Segment used in the human reference, e.g. LEAVE -> MEL-LEAVE-0007. */
  referencePrefix: string;
  /** Has a submission form in the current build. Others are "coming soon". */
  live: boolean;
  /** The approval/sign-off chain, in order. Empty = auto-actioned. */
  chain: ApprovalStepDef[];
};

export type RequestAccent =
  | "leave"
  | "swap"
  | "pay"
  | "details"
  | "uniform"
  | "duty";

export const REQUEST_ACCENT: Record<
  RequestAccent,
  { dot: string; pill: string }
> = {
  leave: {
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/25",
  },
  swap: {
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25",
  },
  pay: {
    dot: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25",
  },
  details: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25",
  },
  uniform: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25",
  },
  duty: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25",
  },
};

export const REQUEST_KINDS: Record<RequestKind, RequestKindConfig> = {
  leave_application: {
    kind: "leave_application",
    label: "Application for Leave",
    description:
      "Formal leave application with supervisor and manager sign-off, then payroll entry.",
    paperForm: "Application for Leave",
    icon: "SunMedium",
    accent: "leave",
    referencePrefix: "LEAVE",
    live: true,
    chain: [
      { role: "supervisor", label: "Supervisor" },
      { role: "dept_manager", label: "Department Manager" },
      { role: "payroll", label: "Payroll · ESP entry" },
    ],
  },
  leave_request: {
    kind: "leave_request",
    label: "Leave Request (pre-approval)",
    description:
      "Request leave blocks for approval or standby before the formal application.",
    paperForm: "RAMP Employee Leave Request Form",
    icon: "CalendarCheck",
    accent: "leave",
    referencePrefix: "LREQ",
    live: false,
    chain: [{ role: "allocator", label: "Allocator" }],
  },
  shift_swap: {
    kind: "shift_swap",
    label: "Shift Swap",
    description:
      "Swap a single rostered shift with a colleague (max 2 per fortnight).",
    paperForm: "Shift Swap Form",
    icon: "ArrowLeftRight",
    accent: "swap",
    referencePrefix: "SWAP",
    live: true,
    chain: [
      {
        role: "requestee",
        label: "Shift counterparty",
        assigneeFromPayload: "requesteeEmployeeId",
      },
      { role: "supervisor", label: "Supervisor" },
      { role: "manager", label: "Manager / Allocator" },
    ],
  },
  line_swap: {
    kind: "line_swap",
    label: "Line Swap",
    description:
      "Swap a whole week's roster line with a colleague (7 days notice).",
    paperForm: "Line Swap Form",
    icon: "Repeat",
    accent: "swap",
    referencePrefix: "LINE",
    live: false,
    chain: [
      {
        role: "requestee",
        label: "Line counterparty",
        assigneeFromPayload: "requesteeEmployeeId",
      },
      { role: "supervisor", label: "Supervisor" },
      { role: "manager", label: "Manager / Allocator" },
    ],
  },
  higher_duty: {
    kind: "higher_duty",
    label: "Higher Duty Allowance",
    description:
      "Fortnightly claim for working a higher-classified role on a relief basis.",
    paperForm: "Higher Duty Allowance Form",
    icon: "TrendingUp",
    accent: "duty",
    referencePrefix: "HDA",
    live: false,
    chain: [
      { role: "supervisor", label: "Supervisor on duty" },
      { role: "manager", label: "PAX / Ramp / Cargo Manager" },
      { role: "station_manager", label: "Station / General Manager" },
      { role: "payroll", label: "Payroll" },
    ],
  },
  leave_cashout: {
    kind: "leave_cashout",
    label: "Leave Cashout",
    description: "Cash out RDO / DIL / annual leave hours in the next pay.",
    paperForm: "RAMP RDO/DIL/Annual Leave payout",
    icon: "Banknote",
    accent: "pay",
    referencePrefix: "CASH",
    live: false,
    chain: [
      { role: "manager", label: "Manager" },
      { role: "payroll", label: "Payroll" },
    ],
  },
  pay_query: {
    kind: "pay_query",
    label: "Pay Query",
    description:
      "Raise a discrepancy on normal, double or Sunday hours against a payslip.",
    paperForm: "Pay Query Form",
    icon: "ReceiptText",
    accent: "pay",
    referencePrefix: "PAY",
    live: false,
    chain: [{ role: "payroll", label: "Payroll" }],
  },
  change_of_details: {
    kind: "change_of_details",
    label: "Change of Details",
    description:
      "Update bank, personal, name or emergency-contact details with HR verification.",
    paperForm: "Employee Change of Details Form",
    icon: "UserCog",
    accent: "details",
    referencePrefix: "CHG",
    live: true,
    chain: [{ role: "hr", label: "HR / Payroll · 3-point ID verification" }],
  },
  uniform_order: {
    kind: "uniform_order",
    label: "Uniform Order",
    description: "Order uniform items by garment, size and quantity.",
    paperForm: "Uniform Order Form",
    icon: "Shirt",
    accent: "uniform",
    referencePrefix: "UNI",
    live: false,
    chain: [{ role: "manager", label: "Office / Stores" }],
  },
};

export const REQUEST_KIND_LIST: RequestKindConfig[] =
  Object.values(REQUEST_KINDS);

export function kindConfig(kind: RequestKind): RequestKindConfig {
  return REQUEST_KINDS[kind];
}

/* -------------------------------------------------------------------------- */
/*  Status styling                                                            */
/* -------------------------------------------------------------------------- */

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  actioned: "Completed",
};

export type StatusTone = "positive" | "warning" | "negative" | "neutral";

export function requestStatusTone(status: RequestStatus): StatusTone {
  switch (status) {
    case "approved":
    case "actioned":
      return "positive";
    case "submitted":
    case "in_review":
      return "warning";
    case "declined":
      return "negative";
    default:
      return "neutral";
  }
}

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  negative: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-muted text-muted-foreground",
};
