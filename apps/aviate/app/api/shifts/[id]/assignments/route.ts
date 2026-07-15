import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id: shiftId } = await params;
  const body = await request.json();
  const employeeId = body?.employeeId as string | undefined;

  if (!employeeId) {
    return apiError("employeeId is required", 400);
  }

  const { data, error } = await ctx.supabase
    .from("shift_assignments")
    .insert({
      org_id: ctx.orgId,
      shift_id: shiftId,
      employee_id: employeeId,
    })
    .select(
      "*, employee:employees (id, full_name, employee_code, job_title, department_id)"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return apiError("Employee is already assigned to this shift", 409);
    }
    return apiError(error.message, error.code === "42501" ? 403 : 500);
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
