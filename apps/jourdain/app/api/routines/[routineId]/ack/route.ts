import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { ackPing } from "@/lib/routines/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { routineId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

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
