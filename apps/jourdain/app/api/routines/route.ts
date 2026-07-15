import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import {
  ROUTINE_DOMAINS,
  ROUTINE_FREQS,
  ROUTINE_TRIGGERS,
  createRoutine,
  listRoutines,
  materializeForUser,
} from "@/lib/routines/service";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM");

const createRoutineSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).nullish(),
    domain: z.enum(ROUTINE_DOMAINS),
    priority: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
    freq: z.enum(ROUTINE_FREQS),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullish(),
    remindTime: hhmm.optional(),
    timezone: z.string().max(64).optional(),
    active: z.boolean().optional(),
    intervalMinutes: z.number().int().min(1).max(1440).nullish(),
    windowStart: hhmm.optional(),
    windowEnd: hhmm.optional(),
    triggerType: z.enum(ROUTINE_TRIGGERS).optional(),
    parentRoutineId: z.string().uuid().nullish(),
    offsetMinutes: z.number().int().min(0).max(525600).nullish(),
    autoComplete: z.boolean().optional(),
    trackTime: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.triggerType === "on_complete") {
      if (!value.parentRoutineId) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a routine to trigger after",
          path: ["parentRoutineId"],
        });
      }
      if (value.offsetMinutes == null) {
        ctx.addIssue({
          code: "custom",
          message: "Set the delay",
          path: ["offsetMinutes"],
        });
      }
    } else if (value.freq === "interval") {
      if (!value.intervalMinutes) {
        ctx.addIssue({
          code: "custom",
          message: "Set how often it repeats",
          path: ["intervalMinutes"],
        });
      }
    } else {
      if (!value.remindTime) {
        ctx.addIssue({
          code: "custom",
          message: "Set a reminder time",
          path: ["remindTime"],
        });
      }
      if (value.freq === "weekly" && (value.daysOfWeek?.length ?? 0) === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Pick at least one day",
          path: ["daysOfWeek"],
        });
      }
    }
  });

export async function GET() {
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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
    // Spawn today's task occurrence immediately if it's due (no-op for pings).
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
