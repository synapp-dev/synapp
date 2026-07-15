import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const { error } = await ctx.supabase.from("shifts").delete().eq("id", id);

  if (error) {
    return apiError(error.message, error.code === "42501" ? 403 : 500);
  }

  return NextResponse.json({ data: { id }, error: null });
}
