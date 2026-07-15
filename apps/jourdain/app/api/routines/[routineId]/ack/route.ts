import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { ackPing } from "@/lib/routines/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { routineId } = await params;
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  try {
    const routine = await ackPing(supabase, routineId);
    return NextResponse.json({ data: routine, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to acknowledge",
        },
      },
      { status: 500 }
    );
  }
}
