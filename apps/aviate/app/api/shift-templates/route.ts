import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const stationId = request.nextUrl.searchParams.get("stationId");
  if (!stationId) {
    return apiError("stationId is required", 400);
  }

  const { data, error } = await ctx.supabase
    .from("shift_templates")
    .select("*")
    .eq("station_id", stationId)
    .order("start_time");

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data, error: null });
}
