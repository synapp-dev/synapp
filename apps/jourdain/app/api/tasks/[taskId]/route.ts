import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { deleteTask, updateTask } from "@/lib/tasks/service";
import {
  removeTaskCalendarEvent,
  syncTaskCalendarEvent,
} from "@/lib/google/task-sync";
import { TASK_DOMAINS } from "@/entities/tasks/model/types";

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    notes: z.string().trim().max(5000).nullish(),
    status: z.enum(["open", "done"]).optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
      .nullish(),
    remindAt: z.string().datetime({ offset: true }).nullish(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    domains: z.array(z.enum(TASK_DOMAINS)).max(TASK_DOMAINS.length).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Empty update",
  });

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { taskId } = await params;
  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  try {
    const task = await updateTask(supabase, taskId, parsed.data);
    await syncTaskCalendarEvent(user.id, task);
    return NextResponse.json({ data: task, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to update task" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { taskId } = await params;
  try {
    await deleteTask(supabase, taskId);
    await removeTaskCalendarEvent(user.id, taskId);
    return NextResponse.json({ data: { id: taskId }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to delete task" },
      },
      { status: 500 }
    );
  }
}
