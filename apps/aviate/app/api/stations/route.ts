import { NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("stations")
    .select("*, departments(*)")
    .order("iata_code");

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data, error: null });
}
