import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getSleepNights } from "@/lib/health/service";

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const nights = await getSleepNights(user.id);
  return NextResponse.json({ data: nights, error: null });
}
