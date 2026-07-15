import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const stationId = request.nextUrl.searchParams.get("stationId");
  // Admin views pass ?all=true to include inactive / onboarding employees.
  const includeAll = request.nextUrl.searchParams.get("all") === "true";

  let query = ctx.supabase.from("employees").select("*").order("full_name");

  if (!includeAll) {
    query = query.eq("status", "active");
  }

  if (stationId) {
    query = query.eq("station_id", stationId);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data, error: null });
}
