import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";
import {
  fetchRequestDetail,
  loadEmployeeForProfile,
} from "@/lib/requests/server";

type RouteParams = { params: Promise<{ id: string }> };

function isManager(role: string) {
  return role === "admin" || role === "manager";
}

// Withdraw an open request. The owner (who raised it) or a manager may cancel.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const me = await loadEmployeeForProfile(ctx.supabase, ctx.userId);
  const manager = isManager(ctx.profile.role);

  const { data: req, error: reqError } = await ctx.supabase
    .from("requests")
    .select("id, status, employee_id")
    .eq("id", id)
    .maybeSingle();

  if (reqError) return apiError(reqError.message, 500);
  if (!req) return apiError("Request not found", 404);
  if (req.status !== "submitted" && req.status !== "in_review") {
    return apiError("Only an open request can be cancelled", 409);
  }

  const isOwner = !!me?.id && req.employee_id === me.id;
  if (!manager && !isOwner) {
    return apiError("You are not authorised to cancel this request", 403);
  }

  const nowIso = new Date().toISOString();
  const { error: updError } = await ctx.supabase
    .from("requests")
    .update({ status: "cancelled", resolved_at: nowIso })
    .eq("id", id);

  if (updError) {
    return apiError(updError.message, updError.code === "42501" ? 403 : 500);
  }

  await ctx.supabase.from("request_events").insert({
    org_id: ctx.orgId,
    request_id: id,
    kind: "cancelled",
    actor_id: ctx.userId,
    detail: {},
  });

  const detail = await fetchRequestDetail(ctx.supabase, id, {
    profileId: ctx.userId,
    isManager: manager,
    employeeId: me?.id ?? null,
  });

  return NextResponse.json({ data: detail, error: null });
}
