import { NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  // RLS scopes this to organisations the caller is a member of.
  const { data, error } = await ctx.supabase
    .from("organisations")
    .select("id, name, slug, logo_url")
    .order("name");

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data, error: null });
}
