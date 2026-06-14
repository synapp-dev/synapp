import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import {
  ROUTINE_DOMAINS,
  ROUTINE_FREQS,
  deleteRoutine,
  materializeForUser,
  updateRoutine,
} from "@/lib/routines/service";

const updateRoutineSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).nullish(),
  domain: z.enum(ROUTINE_DOMAINS).optional(),
  priority: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
  freq: z.enum(ROUTINE_FREQS).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullish(),
  remindTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM").optional(),
  timezone: z.string().max(64).optional(),
  active: z.boolean().optional(),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { routineId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const parsed = updateRoutineSchema.safeParse(
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
    const routine = await updateRoutine(supabase, routineId, parsed.data);
    await materializeForUser(user.id);
    return NextResponse.json({ data: routine, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to update routine",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { routineId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  try {
    await deleteRoutine(supabase, routineId);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to delete routine",
        },
      },
      { status: 500 }
    );
  }
}
