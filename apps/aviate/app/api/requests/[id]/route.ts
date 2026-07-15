import { NextRequest, NextResponse } from "next/server";
import { apiError, requireOrgContext } from "@/lib/api/auth";
import {
  fetchRequestDetail,
  loadEmployeeForProfile,
} from "@/lib/requests/server";

type RouteParams = { params: Promise<{ id: string }> };

function isManager(role: string) {
  return role === "admin" || role === "manager";
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireOrgContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const me = await loadEmployeeForProfile(ctx.supabase, ctx.userId);

  try {
    const detail = await fetchRequestDetail(ctx.supabase, id, {
      profileId: ctx.userId,
      isManager: isManager(ctx.profile.role),
      employeeId: me?.id ?? null,
    });
    if (!detail) return apiError("Request not found", 404);
    return NextResponse.json({ data: detail, error: null });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
