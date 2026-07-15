import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";
import {
  fetchRequestDetail,
  loadEmployeeForProfile,
  runTerminalAction,
} from "@/lib/requests/server";

type RouteParams = { params: Promise<{ id: string }> };

function isManager(role: string) {
  return role === "admin" || role === "manager";
}

// Action the request's current approval step: approve (advance / complete) or
// decline (terminate). Only a manager, or the specifically named counterparty,
// may act — and only on the step currently awaiting a decision.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await request.json();
  const decision = body?.decision as "approved" | "declined" | undefined;
  const signatureName =
    typeof body?.signatureName === "string" ? body.signatureName.trim() : null;
  const note = typeof body?.note === "string" ? body.note.trim() : null;

  if (decision !== "approved" && decision !== "declined") {
    return apiError("decision must be 'approved' or 'declined'", 400);
  }

  const { data: req, error: reqError } = await ctx.supabase
    .from("requests")
    .select("id, kind, status, current_step, employee_id, payload")
    .eq("id", id)
    .maybeSingle();

  if (reqError) return apiError(reqError.message, 500);
  if (!req) return apiError("Request not found", 404);
  if (req.status !== "submitted" && req.status !== "in_review") {
    return apiError("This request is already resolved", 409);
  }

  const { data: steps, error: stepsError } = await ctx.supabase
    .from("request_approvals")
    .select("id, step_order, assignee_employee_id")
    .eq("request_id", id)
    .order("step_order", { ascending: true });

  if (stepsError) return apiError(stepsError.message, 500);
  const currentStep = steps?.find((s) => s.step_order === req.current_step);
  if (!currentStep) return apiError("No pending approval step", 409);

  const me = await loadEmployeeForProfile(ctx.supabase, ctx.userId);
  const manager = isManager(ctx.profile.role);
  const isNamedAssignee =
    !!currentStep.assignee_employee_id &&
    currentStep.assignee_employee_id === me?.id;

  if (!manager && !isNamedAssignee) {
    return apiError("You are not authorised to action this step", 403);
  }

  const nowIso = new Date().toISOString();

  const { error: updStepError } = await ctx.supabase
    .from("request_approvals")
    .update({
      decision,
      decided_by: ctx.userId,
      decided_at: nowIso,
      signature_name: signatureName,
      note,
    })
    .eq("id", currentStep.id);

  if (updStepError) {
    return apiError(
      updStepError.message,
      updStepError.code === "42501" ? 403 : 500
    );
  }

  if (decision === "declined") {
    await ctx.supabase
      .from("requests")
      .update({
        status: "declined",
        resolved_at: nowIso,
        resolution_note: note ?? "Declined",
      })
      .eq("id", id);
    await ctx.supabase.from("request_events").insert({
      org_id: ctx.orgId,
      request_id: id,
      kind: "declined",
      actor_id: ctx.userId,
      detail: { step: req.current_step, note },
    });
  } else {
    const maxStep = Math.max(...steps!.map((s) => s.step_order));
    const isFinal = currentStep.step_order === maxStep;

    await ctx.supabase.from("request_events").insert({
      org_id: ctx.orgId,
      request_id: id,
      kind: "approved",
      actor_id: ctx.userId,
      detail: { step: req.current_step },
    });

    if (isFinal) {
      const actionNote = await runTerminalAction(ctx.supabase, {
        kind: req.kind,
        employee_id: req.employee_id,
        payload: (req.payload as Record<string, unknown>) ?? {},
      });
      await ctx.supabase
        .from("requests")
        .update({
          status: "actioned",
          resolved_at: nowIso,
          resolution_note: actionNote,
        })
        .eq("id", id);
      await ctx.supabase.from("request_events").insert({
        org_id: ctx.orgId,
        request_id: id,
        kind: "actioned",
        actor_id: ctx.userId,
        detail: { note: actionNote },
      });
    } else {
      await ctx.supabase
        .from("requests")
        .update({ status: "in_review", current_step: req.current_step + 1 })
        .eq("id", id);
    }
  }

  const detail = await fetchRequestDetail(ctx.supabase, id, {
    profileId: ctx.userId,
    isManager: manager,
    employeeId: me?.id ?? null,
  });

  return NextResponse.json({ data: detail, error: null });
}
