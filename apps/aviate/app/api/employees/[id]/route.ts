import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";
import type { TablesUpdate } from "@/types/supabase";

type RouteParams = { params: Promise<{ id: string }> };

const EMPLOYMENT_TYPES = ["full_time", "part_time", "casual"] as const;
const STATUSES = ["active", "inactive", "onboarding"] as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from("employees")
    .select("*")
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
  const body = (await request.json()) as Record<string, unknown>;

  const update: TablesUpdate<"employees"> = {};

  // Free-text fields — empty string collapses to null for nullable columns.
  const asText = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  if ("full_name" in body) {
    const name = asText(body.full_name);
    if (!name) return apiError("full_name is required", 400);
    update.full_name = name;
  }
  if ("employee_code" in body) {
    const code = asText(body.employee_code);
    if (!code) return apiError("employee_code is required", 400);
    update.employee_code = code;
  }
  if ("email" in body) update.email = asText(body.email);
  if ("phone" in body) update.phone = asText(body.phone);
  if ("job_title" in body) update.job_title = asText(body.job_title);
  if ("started_on" in body) update.started_on = asText(body.started_on);
  if ("station_id" in body) update.station_id = asText(body.station_id);
  if ("department_id" in body) update.department_id = asText(body.department_id);

  if ("employment_type" in body) {
    const t = body.employment_type;
    if (!EMPLOYMENT_TYPES.includes(t as (typeof EMPLOYMENT_TYPES)[number])) {
      return apiError("invalid employment_type", 400);
    }
    update.employment_type = t as (typeof EMPLOYMENT_TYPES)[number];
  }
  if ("status" in body) {
    const s = body.status;
    if (!STATUSES.includes(s as (typeof STATUSES)[number])) {
      return apiError("invalid status", 400);
    }
    update.status = s as (typeof STATUSES)[number];
  }

  if (Object.keys(update).length === 0) {
    return apiError("No editable fields provided", 400);
  }

  const { data, error } = await ctx.supabase
    .from("employees")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return apiError(error.message, error.code === "42501" ? 403 : 500);
  }

  return NextResponse.json({ data, error: null });
}
