import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/api/auth";
import { loadEmployeeForProfile } from "@/lib/requests/server";
import type { MeEmployee } from "@/entities/requests/model/types";

// The workforce record linked to the signed-in profile (or null). Drives the
// "acting as" identity for raising and owning requests.
export async function GET() {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const employee = await loadEmployeeForProfile(ctx.supabase, ctx.userId);

  const data: MeEmployee = employee
    ? {
        id: employee.id,
        fullName: employee.full_name,
        employeeCode: employee.employee_code,
        jobTitle: employee.job_title,
        stationId: employee.station_id,
        departmentId: employee.department_id,
      }
    : null;

  return NextResponse.json({ data, error: null });
}
