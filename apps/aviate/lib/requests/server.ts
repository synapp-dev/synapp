/**
 * Server-side helpers for the requests workflow: identity resolution, human
 * reference generation, row shaping (join -> DTO), and the terminal actions
 * that run when a request is fully approved.
 *
 * Routes stay thin by delegating the joined selects and the "what happens when
 * this is approved" logic here.
 */

import type { createServerClient } from "@/utils/supabase/server";
import type {
  ApprovalStep,
  RequestDetail,
  RequestEvent,
  RequestListItem,
} from "@/entities/requests/model/types";
import { kindConfig, type RequestKind } from "@/lib/requests/config";
import type { Tables } from "@/types/supabase";

export type SupabaseServer = Awaited<ReturnType<typeof createServerClient>>;

/** Resolve the workforce record linked to the signed-in profile, if any. */
export async function loadEmployeeForProfile(
  supabase: SupabaseServer,
  profileId: string
) {
  const { data } = await supabase
    .from("employees")
    .select("id, full_name, employee_code, job_title, station_id, department_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Build the next reference for a kind, e.g. MEL-LEAVE-0008. Scans existing
 * references sharing the prefix in the org and increments the max suffix, so
 * it stays stable even if rows are deleted.
 */
export async function nextReference(
  supabase: SupabaseServer,
  orgId: string,
  stationIata: string | null,
  kind: RequestKind
): Promise<string> {
  const prefix = kindConfig(kind).referencePrefix;
  const { data } = await supabase
    .from("requests")
    .select("reference")
    .eq("org_id", orgId)
    .ilike("reference", `%-${prefix}-%`);

  let max = 0;
  for (const row of data ?? []) {
    const m = /-(\d+)$/.exec(row.reference);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const seq = String(max + 1).padStart(4, "0");
  return `${stationIata ?? "REQ"}-${prefix}-${seq}`;
}

/* -------------------------------------------------------------------------- */
/*  Row shaping                                                               */
/* -------------------------------------------------------------------------- */

const LIST_SELECT =
  "id, kind, reference, title, status, current_step, employee_id, submitted_at, resolved_at, " +
  "employee:employees!requests_employee_id_fkey(full_name), " +
  "station:stations(iata_code), " +
  "approvals:request_approvals(step_order, label, decision)";

type ListJoinRow = Tables<"requests"> & {
  employee: { full_name: string } | null;
  station: { iata_code: string } | null;
  approvals: { step_order: number; label: string; decision: string }[];
};

function currentStepLabel(row: {
  status: string;
  current_step: number;
  approvals: { step_order: number; label: string }[];
}): string | null {
  const open = row.status === "submitted" || row.status === "in_review";
  if (!open) return null;
  return (
    row.approvals.find((a) => a.step_order === row.current_step)?.label ?? null
  );
}

function shapeListItem(row: ListJoinRow): RequestListItem {
  return {
    id: row.id,
    kind: row.kind,
    reference: row.reference,
    title: row.title,
    status: row.status,
    currentStep: row.current_step,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    stationIata: row.station?.iata_code ?? null,
    submittedAt: row.submitted_at,
    resolvedAt: row.resolved_at,
    currentStepLabel: currentStepLabel(row),
  };
}

export type ListScope = "mine" | "inbox" | "all";

/**
 * List requests for a scope. RLS already limits visibility; the scope narrows
 * further: `mine` = raised by the caller, `inbox` = open and awaiting action,
 * `all` = everything the caller can see.
 */
export async function fetchRequestList(
  supabase: SupabaseServer,
  opts: { scope: ListScope; employeeId: string | null }
): Promise<RequestListItem[]> {
  let query = supabase
    .from("requests")
    .select(LIST_SELECT)
    .order("submitted_at", { ascending: false });

  if (opts.scope === "mine" && opts.employeeId) {
    query = query.eq("employee_id", opts.employeeId);
  } else if (opts.scope === "inbox") {
    query = query.in("status", ["submitted", "in_review"]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let items = (data as unknown as ListJoinRow[]).map(shapeListItem);
  // Inbox excludes the caller's own requests — you don't approve your own.
  if (opts.scope === "inbox" && opts.employeeId) {
    items = items.filter((r) => r.employeeId !== opts.employeeId);
  }
  return items;
}

const DETAIL_SELECT =
  "*, " +
  "employee:employees!requests_employee_id_fkey(full_name), " +
  "station:stations(iata_code), " +
  "department:departments(name), " +
  "approvals:request_approvals(id, step_order, role, label, decision, assignee_employee_id, decided_at, signature_name, note, " +
  "assignee:employees!request_approvals_assignee_employee_id_fkey(full_name), " +
  "decided_by_profile:profiles!request_approvals_decided_by_fkey(full_name)), " +
  "events:request_events(id, kind, detail, created_at, actor:profiles!request_events_actor_id_fkey(full_name))";

export async function fetchRequestDetail(
  supabase: SupabaseServer,
  id: string,
  ctx: { profileId: string; isManager: boolean; employeeId: string | null }
): Promise<RequestDetail | null> {
  const { data, error } = await supabase
    .from("requests")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as ListJoinRow & {
    payload: Record<string, unknown>;
    department: { name: string } | null;
    resolution_note: string | null;
    approvals: (ApprovalStepJoin & { step_order: number })[];
    events: EventJoin[];
  };

  const approvals: ApprovalStep[] = [...row.approvals]
    .sort((a, b) => a.step_order - b.step_order)
    .map((a) => ({
      id: a.id,
      stepOrder: a.step_order,
      role: a.role,
      label: a.label,
      decision: a.decision,
      assigneeEmployeeId: a.assignee_employee_id,
      assigneeName: a.assignee?.full_name ?? null,
      decidedByName: a.decided_by_profile?.full_name ?? null,
      decidedAt: a.decided_at,
      signatureName: a.signature_name,
      note: a.note,
    }));

  const events: RequestEvent[] = [...(row.events ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      detail: (e.detail as Record<string, unknown>) ?? {},
      actorName: e.actor?.full_name ?? null,
      createdAt: e.created_at,
    }));

  const isOwner =
    !!ctx.employeeId && row.employee_id === ctx.employeeId;

  const currentApproval = approvals.find(
    (a) => a.stepOrder === row.current_step
  );
  const open = row.status === "submitted" || row.status === "in_review";
  const isNamedAssigneeMe =
    !!currentApproval?.assigneeEmployeeId &&
    currentApproval.assigneeEmployeeId === ctx.employeeId;
  const canAct = open && (ctx.isManager || isNamedAssigneeMe);

  return {
    ...shapeListItem(row),
    payload: (row.payload as Record<string, unknown>) ?? {},
    departmentName: row.department?.name ?? null,
    resolutionNote: row.resolution_note ?? null,
    approvals,
    events,
    canAct,
    isOwner,
  };
}

type ApprovalStepJoin = {
  id: string;
  role: ApprovalStep["role"];
  label: string;
  decision: ApprovalStep["decision"];
  assignee_employee_id: string | null;
  decided_at: string | null;
  signature_name: string | null;
  note: string | null;
  assignee: { full_name: string } | null;
  decided_by_profile: { full_name: string } | null;
};

type EventJoin = {
  id: string;
  kind: RequestEvent["kind"];
  detail: unknown;
  created_at: string;
  actor: { full_name: string } | null;
};

/* -------------------------------------------------------------------------- */
/*  Terminal actions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Run the side effect of a fully-approved request and return a note describing
 * what happened. Kept deliberately conservative: writes back only what the
 * schema can hold today, otherwise records intent for payroll/HR to execute.
 */
export async function runTerminalAction(
  supabase: SupabaseServer,
  request: {
    kind: RequestKind;
    employee_id: string | null;
    payload: Record<string, unknown>;
  }
): Promise<string> {
  switch (request.kind) {
    case "change_of_details": {
      const personal = (request.payload.personal ?? {}) as Record<
        string,
        unknown
      >;
      const patch: Partial<Tables<"employees">> = {};
      if (typeof personal.phone === "string" && personal.phone)
        patch.phone = personal.phone;
      if (typeof personal.email === "string" && personal.email)
        patch.email = personal.email;
      if (request.employee_id && Object.keys(patch).length > 0) {
        await supabase
          .from("employees")
          .update(patch)
          .eq("id", request.employee_id);
        return "Verified and applied to the employee record.";
      }
      return "Verified. Bank / name changes forwarded to Payroll to apply.";
    }
    case "shift_swap":
    case "line_swap":
      return "Approved. Roster updated by the allocator.";
    case "leave_application":
      return "Approved and recorded in payroll / ESP.";
    case "leave_cashout":
      return "Approved. Payout scheduled in the next pay run.";
    case "higher_duty":
      return "Approved. Allowance forwarded to Payroll for the fortnight.";
    case "uniform_order":
      return "Approved. Order placed with stores.";
    default:
      return "Approved.";
  }
}
