import type { Tables } from "@/types/supabase";
import type {
  ApprovalDecision,
  ApprovalRole,
  RequestKind,
  RequestStatus,
} from "@/lib/requests/config";

export type RequestRow = Tables<"requests">;
export type ApprovalRow = Tables<"request_approvals">;
export type RequestEventRow = Tables<"request_events">;

/** A request row plus the joined employee name for list rendering. */
export type RequestListItem = {
  id: string;
  kind: RequestKind;
  reference: string;
  title: string;
  status: RequestStatus;
  currentStep: number;
  employeeId: string | null;
  employeeName: string | null;
  stationIata: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  /** The step currently awaiting a decision, when the request is open. */
  currentStepLabel: string | null;
};

export type ApprovalStep = {
  id: string;
  stepOrder: number;
  role: ApprovalRole;
  label: string;
  decision: ApprovalDecision;
  assigneeEmployeeId: string | null;
  assigneeName: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  signatureName: string | null;
  note: string | null;
};

export type RequestEvent = {
  id: string;
  kind: RequestEventRow["kind"];
  detail: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
};

export type RequestDetail = RequestListItem & {
  payload: Record<string, unknown>;
  departmentName: string | null;
  resolutionNote: string | null;
  approvals: ApprovalStep[];
  events: RequestEvent[];
  /** Whether the signed-in caller may action the current step. */
  canAct: boolean;
  /** Whether the signed-in caller owns (raised) this request. */
  isOwner: boolean;
};

export type CreateRequestInput = {
  kind: RequestKind;
  /** Defaults to the caller's linked employee when omitted. */
  employeeId?: string;
  title: string;
  payload: Record<string, unknown>;
};

export type DecisionInput = {
  decision: "approved" | "declined";
  signatureName?: string;
  note?: string;
};

export type MeEmployee = {
  id: string;
  fullName: string;
  employeeCode: string;
  jobTitle: string | null;
  stationId: string | null;
  departmentId: string | null;
} | null;
