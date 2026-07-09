import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { addDays } from "@/lib/scoring/compute";
import type {
  CheckinGroup,
  CheckinItem,
  CheckinReview,
} from "@/entities/checkin/model/types";
import type { TaskDomain, TaskPriority } from "@/entities/tasks/model/types";

const MISSED_REVIEW_DAYS = 3;
const FALLBACK_TIMEZONE = "Australia/Sydney";

type ReviewRow = {
  id: string;
  title: string;
  domains: TaskDomain[] | null;
  priority: TaskPriority;
  due_date: string | null;
  occurrence_date: string | null;
  routines: { track_time: boolean } | null;
};

/** Today's YYYY-MM-DD in the given timezone (en-CA formats as ISO). */
function localDate(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Lock in the user's stale open routine occurrences as missed (tz-aware). */
export async function expireMissedTasksForUser(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("expire_missed_tasks", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/** Resolve auto-complete routine occurrences as done on app open (tz-aware). */
export async function autoCompleteRoutineTasksForUser(
  userId: string
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("auto_complete_routine_tasks", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/** Unresolved items needing review: recent misses, today's routines, overdue one-offs. */
export async function getCheckinReview(
  supabase: SupabaseClient,
  userId: string,
  clientDate?: string
): Promise<CheckinReview> {
  // Resolve auto-completes first, then lock in stale misses, so the review list
  // is authoritative before we read it.
  await autoCompleteRoutineTasksForUser(userId);
  await expireMissedTasksForUser(userId);

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("timezone, last_checkin_at")
    .eq("user_id", userId)
    .maybeSingle();

  const today =
    clientDate ??
    localDate((settings?.timezone as string | undefined) ?? FALLBACK_TIMEZONE);
  const missedFloor = addDays(today, -MISSED_REVIEW_DAYS);
  const routineColumns =
    "id, title, domains, priority, due_date, occurrence_date, routines!inner(track_time, auto_complete)";
  const oneoffColumns =
    "id, title, domains, priority, due_date, occurrence_date";

  const [missedRes, todayRes, overdueRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(routineColumns)
      .eq("status", "missed")
      .eq("routines.auto_complete", false)
      .gte("occurrence_date", missedFloor)
      .lt("occurrence_date", today),
    supabase
      .from("tasks")
      .select(routineColumns)
      .eq("status", "open")
      .eq("routines.auto_complete", false)
      .eq("occurrence_date", today),
    supabase
      .from("tasks")
      .select(oneoffColumns)
      .eq("status", "open")
      .is("routine_id", null)
      .not("due_date", "is", null)
      .lt("due_date", today),
  ]);
  if (missedRes.error) throw new Error(missedRes.error.message);
  if (todayRes.error) throw new Error(todayRes.error.message);
  if (overdueRes.error) throw new Error(overdueRes.error.message);

  const items: CheckinItem[] = [
    ...((missedRes.data as unknown as ReviewRow[]) ?? []).map((row) =>
      toItem(row, "missed")
    ),
    ...((todayRes.data as unknown as ReviewRow[]) ?? []).map((row) =>
      toItem(row, "today")
    ),
    ...((overdueRes.data as unknown as ReviewRow[]) ?? []).map((row) =>
      toItem(row, "oneoff")
    ),
  ];

  const byDate = new Map<string, CheckinItem[]>();
  for (const item of items) {
    const list = byDate.get(item.date);
    if (list) list.push(item);
    else byDate.set(item.date, [item]);
  }
  const groups: CheckinGroup[] = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, dateItems]) => ({
      date,
      items: dateItems.sort((a, b) => a.priority - b.priority),
    }));

  return {
    groups,
    lastCheckinAt: (settings?.last_checkin_at as string | null) ?? null,
  };
}

function toItem(row: ReviewRow, kind: CheckinItem["kind"]): CheckinItem {
  return {
    taskId: row.id,
    title: row.title,
    kind,
    date: (row.occurrence_date ?? row.due_date)!,
    domains: row.domains ?? [],
    priority: row.priority,
    trackTime: kind === "oneoff" ? false : Boolean(row.routines?.track_time),
  };
}
