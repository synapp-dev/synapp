import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";
import {
  REQUEST_KINDS,
  kindConfig,
  type RequestKind,
} from "@/lib/requests/config";
import {
  fetchRequestDetail,
  fetchRequestList,
  loadEmployeeForProfile,
  nextReference,
  runTerminalAction,
  type ListScope,
} from "@/lib/requests/server";

const SCOPES: ListScope[] = ["mine", "inbox", "all"];

function isManager(role: string) {
  return role === "admin" || role === "manager";
}

export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const scopeParam = request.nextUrl.searchParams.get("scope") ?? "mine";
  const scope = (SCOPES.includes(scopeParam as ListScope)
    ? scopeParam
    : "mine") as ListScope;

  const me = await loadEmployeeForProfile(ctx.supabase, ctx.userId);

  try {
    const data = await fetchRequestList(ctx.supabase, {
      scope,
      employeeId: me?.id ?? null,
    });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const kind = body?.kind as RequestKind | undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const payload =
    body?.payload && typeof body.payload === "object" ? body.payload : {};
  const explicitEmployeeId =
    typeof body?.employeeId === "string" ? body.employeeId : null;

  if (!kind || !(kind in REQUEST_KINDS)) {
    return apiError("A valid request kind is required", 400);
  }
  if (!title) {
    return apiError("A title is required", 400);
  }

  // Resolve the employee the request is about: an explicit target (managers
  // acting on behalf) or the caller's own linked workforce record.
  let targetEmployeeId = explicitEmployeeId;
  if (!targetEmployeeId) {
    const me = await loadEmployeeForProfile(ctx.supabase, ctx.userId);
    targetEmployeeId = me?.id ?? null;
  }
  if (!targetEmployeeId) {
    return apiError(
      "Your login is not linked to an employee record yet, so requests can't be attributed to you.",
      422
    );
  }

  const { data: employee, error: empError } = await ctx.supabase
    .from("employees")
    .select("id, station_id, department_id, station:stations(iata_code)")
    .eq("id", targetEmployeeId)
    .single();

  if (empError || !employee) {
    return apiError("Employee record not found", 404);
  }

  const stationIata =
    (employee.station as { iata_code: string } | null)?.iata_code ?? null;
  const config = kindConfig(kind);
  const reference = await nextReference(
    ctx.supabase,
    ctx.orgId,
    stationIata,
    kind
  );

  const hasChain = config.chain.length > 0;

  const { data: created, error: createError } = await ctx.supabase
    .from("requests")
    .insert({
      org_id: ctx.orgId,
      kind,
      employee_id: targetEmployeeId,
      station_id: employee.station_id,
      department_id: employee.department_id,
      reference,
      title,
      payload,
      status: hasChain ? "submitted" : "actioned",
      current_step: 1,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (createError || !created) {
    const status = createError?.code === "42501" ? 403 : 500;
    return apiError(createError?.message ?? "Could not create request", status);
  }

  const requestId = created.id;

  // Materialise the approval chain. A `requestee` step is pinned to the named
  // counterparty carried in the payload.
  if (hasChain) {
    const steps = config.chain.map((step, index) => {
      const assigneeKey = step.assigneeFromPayload;
      const assignee =
        assigneeKey && typeof payload[assigneeKey] === "string"
          ? (payload[assigneeKey] as string)
          : null;
      return {
        org_id: ctx.orgId,
        request_id: requestId,
        step_order: index + 1,
        role: step.role,
        label: step.label,
        assignee_employee_id: assignee,
      };
    });
    const { error: stepError } = await ctx.supabase
      .from("request_approvals")
      .insert(steps);
    if (stepError) {
      return apiError(stepError.message, 500);
    }
  }

  await ctx.supabase.from("request_events").insert({
    org_id: ctx.orgId,
    request_id: requestId,
    kind: "submitted",
    actor_id: ctx.userId,
    detail: { reference },
  });

  // Chainless kinds are actioned immediately.
  if (!hasChain) {
    const note = await runTerminalAction(ctx.supabase, {
      kind,
      employee_id: targetEmployeeId,
      payload,
    });
    await ctx.supabase
      .from("requests")
      .update({ resolved_at: new Date().toISOString(), resolution_note: note })
      .eq("id", requestId);
    await ctx.supabase.from("request_events").insert({
      org_id: ctx.orgId,
      request_id: requestId,
      kind: "actioned",
      actor_id: ctx.userId,
      detail: { note },
    });
  }

  const detail = await fetchRequestDetail(ctx.supabase, requestId, {
    profileId: ctx.userId,
    isManager: isManager(ctx.profile.role),
    employeeId: targetEmployeeId,
  });

  return NextResponse.json({ data: detail, error: null }, { status: 201 });
}
