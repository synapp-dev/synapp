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
    .from("roster_periods")
    .select("*")
    .eq("station_id", stationId)
    .order("starts_on", { ascending: false });

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const { stationId, name, startsOn, endsOn } = body ?? {};

  if (!stationId || !name || !startsOn || !endsOn) {
    return apiError("stationId, name, startsOn and endsOn are required", 400);
  }
  if (endsOn < startsOn) {
    return apiError("endsOn must be on or after startsOn", 400);
  }

  const { data, error } = await ctx.supabase
    .from("roster_periods")
    .insert({
      org_id: ctx.orgId,
      station_id: stationId,
      name,
      starts_on: startsOn,
      ends_on: endsOn,
    })
    .select("*")
    .single();

  if (error) {
    // RLS denial surfaces as a generic error; map it to 403 for clarity.
    const status = error.code === "42501" ? 403 : 500;
    return apiError(error.message, status);
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
