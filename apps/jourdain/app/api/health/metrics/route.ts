import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getHealthMetrics } from "@/lib/health/service";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const names = (request.nextUrl.searchParams.get("names") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const metrics = await getHealthMetrics(user.id, names);
  return NextResponse.json({ data: metrics, error: null });
}
