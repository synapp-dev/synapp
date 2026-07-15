import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from("roster_periods")
    .select(
      `*,
       shifts (
         *,
         assignments:shift_assignments (
           *,
           employee:employees (id, full_name, employee_code, job_title, department_id)
         )
       )`
    )
    .eq("id", id)
    .single();

  if (error) {
    return apiError(error.message, error.code === "PGRST116" ? 404 : 500);
  }

  return NextResponse.json({ data, error: null });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await request.json();
  const status = body?.status as string | undefined;

  if (!status || !["draft", "published", "locked"].includes(status)) {
    return apiError("status must be draft, published or locked", 400);
  }

  const { data, error } = await ctx.supabase
    .from("roster_periods")
    .update({
      status: status as "draft" | "published" | "locked",
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return apiError(error.message, error.code === "42501" ? 403 : 500);
  }

  return NextResponse.json({ data, error: null });
}
