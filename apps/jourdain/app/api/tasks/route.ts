import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { createTask, listTasks } from "@/lib/tasks/service";
import { syncTaskCalendarEvent } from "@/lib/google/task-sync";
import { TASK_DOMAINS, type TaskStatus } from "@/entities/tasks/model/types";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(5000).nullish(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .nullish(),
  remindAt: z.string().datetime({ offset: true }).nullish(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  domains: z.array(z.enum(TASK_DOMAINS)).max(TASK_DOMAINS.length).optional(),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam === "open" || statusParam === "done"
      ? (statusParam as TaskStatus)
      : undefined;

  try {
    const tasks = await listTasks(supabase, { status });
    return NextResponse.json({ data: tasks, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to list tasks" },
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

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  try {
    const task = await createTask(supabase, user.id, parsed.data);
    await syncTaskCalendarEvent(user.id, task);
    return NextResponse.json({ data: task, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to create task" },
      },
      { status: 500 }
    );
  }
}
