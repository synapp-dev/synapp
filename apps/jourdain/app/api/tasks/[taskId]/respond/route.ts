import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { respondToTask } from "@/lib/tasks/service";

const respondSchema = z.object({
  action: z.enum(["done", "skip", "delay"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const { taskId } = await params;
  const parsed = respondSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { message: parsed.error.issues[0]?.message ?? "Invalid body" },
      },
      { status: 400 }
    );
  }

  try {
    const task = await respondToTask(supabase, taskId, parsed.data.action);
    return NextResponse.json({ data: task, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to respond",
        },
      },
      { status: 500 }
    );
  }
}
