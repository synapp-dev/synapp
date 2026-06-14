import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import {
  ROUTINE_DOMAINS,
  ROUTINE_FREQS,
  createRoutine,
  listRoutines,
  materializeForUser,
} from "@/lib/routines/service";

const createRoutineSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullish(),
  domain: z.enum(ROUTINE_DOMAINS),
  priority: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
  freq: z.enum(ROUTINE_FREQS),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullish(),
  remindTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
  timezone: z.string().max(64).optional(),
  active: z.boolean().optional(),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  try {
    const routines = await listRoutines(supabase);
    return NextResponse.json({ data: routines, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to list routines",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const parsed = createRoutineSchema.safeParse(
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
    const routine = await createRoutine(supabase, user.id, parsed.data);
    // Spawn today's occurrence immediately if it's due, so the reminder fires
    // today rather than waiting for the next day's materialization.
    await materializeForUser(user.id);
    return NextResponse.json({ data: routine, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to create routine",
        },
      },
      { status: 500 }
    );
  }
}
