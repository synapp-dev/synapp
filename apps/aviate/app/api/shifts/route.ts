import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export async function POST(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const {
    rosterPeriodId,
    departmentId,
    templateId,
    shiftDate,
    startTime,
    endTime,
    requiredHeadcount,
    notes,
  } = body ?? {};

  if (!rosterPeriodId || !shiftDate || !startTime || !endTime) {
    return apiError(
      "rosterPeriodId, shiftDate, startTime and endTime are required",
      400
    );
  }
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return apiError("startTime and endTime must be HH:MM", 400);
  }

  const { data: period, error: periodError } = await ctx.supabase
    .from("roster_periods")
    .select("id, station_id, starts_on, ends_on")
    .eq("id", rosterPeriodId)
    .single();

  if (periodError || !period) {
    return apiError("Roster period not found", 404);
  }
  if (shiftDate < period.starts_on || shiftDate > period.ends_on) {
    return apiError("shiftDate is outside the roster period", 400);
  }

  const { data, error } = await ctx.supabase
    .from("shifts")
    .insert({
      org_id: ctx.orgId,
      roster_period_id: period.id,
      station_id: period.station_id,
      department_id: departmentId ?? null,
      template_id: templateId ?? null,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      required_headcount: requiredHeadcount ?? 1,
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return apiError(error.message, error.code === "42501" ? 403 : 500);
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
