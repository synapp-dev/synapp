import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getWorkouts } from "@/lib/health/service";

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const workouts = await getWorkouts(user.id);
  return NextResponse.json({ data: workouts, error: null });
}
