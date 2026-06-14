import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateTaskInput,
  Task,
  TaskDomain,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "@/entities/tasks/model/types";

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  domains: TaskDomain[];
  due_date: string | null;
  remind_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const TASK_COLUMNS =
  "id, title, notes, status, priority, domains, due_date, remind_at, completed_at, created_at, updated_at";

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    domains: row.domains ?? [],
    dueDate: row.due_date,
    remindAt: row.remind_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTasks(
  supabase: SupabaseClient,
  filters?: { status?: TaskStatus; dueOnOrBefore?: string }
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.dueOnOrBefore) {
    query = query.lte("due_date", filters.dueOnOrBefore);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(toTask);
}

export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      notes: input.notes ?? null,
      due_date: input.dueDate ?? null,
      remind_at: input.remindAt ?? null,
      priority: input.priority ?? 4,
      domains: input.domains ?? [],
    })
    .select(TASK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toTask(data as TaskRow);
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.remindAt !== undefined) {
    patch.remind_at = input.remindAt;
    // A new or changed reminder should fire again — clear the sent marker.
    patch.reminded_at = null;
  }
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.domains !== undefined) patch.domains = input.domains;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at = input.status === "done" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toTask(data as TaskRow);
}

export async function deleteTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function getTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toTask(data as TaskRow) : null;
}

export type TaskResponse = "done" | "skip" | "delay";

/** Apply a reminder-card response, recording when the user responded. */
export async function respondToTask(
  supabase: SupabaseClient,
  taskId: string,
  action: TaskResponse
): Promise<Task> {
  const nowIso = new Date().toISOString();
  let patch: Record<string, unknown>;
  if (action === "done") {
    patch = { status: "done", completed_at: nowIso, responded_at: nowIso };
  } else if (action === "skip") {
    patch = { status: "skipped", completed_at: null, responded_at: nowIso };
  } else {
    // delay: bump the reminder 5 minutes and let the runner fire it again.
    patch = {
      remind_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      reminded_at: null,
    };
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTask(data as TaskRow);
}
