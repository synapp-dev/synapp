import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isPushConfigured, sendPushToUser } from "@/lib/push/server";

export const maxDuration = 60;

// Allow a little overshoot so a task whose reminder fell between cron ticks
// still fires on the next run.
type DueTask = { id: string; user_id: string; title: string };
type DigestUser = {
  user_id: string;
  digest_hour: number;
  timezone: string;
  last_digest_date: string | null;
};
type DigestTask = { title: string };
type StaleAccount = { user_id: string; updated_at: string };
type BankReminder = { user_id: string; enabled: boolean; last_sent: string | null };

const BANK_STALE_DAYS = 7;

/** Local calendar date + hour for a timezone, computed without extra deps. */
function localDateHour(timezone: string): { date: string; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";
    let hour = Number.parseInt(get("hour"), 10);
    if (hour === 24) hour = 0; // some runtimes render midnight as 24
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
  } catch {
    return null; // invalid timezone string
  }
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function runReminders() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let taskReminders = 0;
  let digestsSent = 0;

  // 0. Materialize routine occurrences due today (idempotent, tz-aware) so their
  // reminders exist before we scan for due reminders below.
  let routinesMaterialized = 0;
  try {
    const { data: created } = await admin.rpc("materialize_due_routines", {
      p_user_id: null,
    });
    routinesMaterialized = (created as number) ?? 0;
  } catch (err) {
    console.warn(
      "[run-reminders] routine materialization failed:",
      err instanceof Error ? err.message : err
    );
  }

  // 1. Per-task reminders that are due and not yet sent. ----------------------
  const { data: dueData } = await admin
    .from("tasks")
    .select("id, user_id, title")
    .eq("status", "open")
    .not("remind_at", "is", null)
    .is("reminded_at", null)
    .lte("remind_at", nowIso);

  const dueTasks = (dueData as DueTask[] | null) ?? [];
  for (const task of dueTasks) {
    // iOS already shows "Jourdain" (the installed app's name) as the header, so
    // the title carries the task itself — no redundant "Reminder"/app-name line.
    const result = await sendPushToUser(task.user_id, {
      title: task.title,
      body: "",
      url: `/tasks?respond=${task.id}`,
      tag: `task-${task.id}`,
    });
    taskReminders += result.sent;
  }
  if (dueTasks.length > 0) {
    // Mark sent regardless of delivery count so we never re-fire a reminder.
    await admin
      .from("tasks")
      .update({ reminded_at: nowIso })
      .in(
        "id",
        dueTasks.map((task) => task.id)
      );
  }

  // 2. Daily digests for users whose local hour matches their setting. --------
  const { data: digestData } = await admin
    .from("notification_settings")
    .select("user_id, digest_hour, timezone, last_digest_date")
    .eq("daily_digest_enabled", true);

  const digestUsers = (digestData as DigestUser[] | null) ?? [];
  for (const settings of digestUsers) {
    const local = localDateHour(settings.timezone);
    if (!local) continue;
    if (local.hour !== settings.digest_hour) continue;
    if (settings.last_digest_date === local.date) continue; // already done today

    const { data: taskData } = await admin
      .from("tasks")
      .select("title")
      .eq("user_id", settings.user_id)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", local.date)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true })
      .limit(6);

    const tasks = (taskData as DigestTask[] | null) ?? [];
    if (tasks.length > 0) {
      const titles = tasks.slice(0, 3).map((task) => task.title);
      const extra = tasks.length > titles.length ? ` +${tasks.length - titles.length} more` : "";
      const result = await sendPushToUser(settings.user_id, {
        title:
          tasks.length === 1
            ? "1 task due today"
            : `${tasks.length} tasks due`,
        body: `${titles.join(" · ")}${extra}`,
        url: "/dashboard",
        tag: "daily-digest",
      });
      digestsSent += result.sent;
    }

    // Mark the digest handled for today even when there were no tasks, so we
    // don't re-query this user every cron tick during the digest hour.
    await admin
      .from("notification_settings")
      .update({ last_digest_date: local.date })
      .eq("user_id", settings.user_id);
  }

  // 3. Bank import staleness nudges — one push per UTC day per user while any
  // of their accounts hasn't been re-imported in BANK_STALE_DAYS days. Stops
  // automatically once they import (which refreshes bank_accounts.updated_at).
  let bankNudges = 0;
  const todayUtc = nowIso.slice(0, 10);
  const staleBefore = new Date(
    Date.now() - BANK_STALE_DAYS * 86_400_000
  ).toISOString();

  const { data: staleData } = await admin
    .from("bank_accounts")
    .select("user_id, updated_at")
    .lt("updated_at", staleBefore);

  const oldestByUser = new Map<string, string>();
  for (const row of (staleData as StaleAccount[] | null) ?? []) {
    const current = oldestByUser.get(row.user_id);
    if (!current || row.updated_at < current) {
      oldestByUser.set(row.user_id, row.updated_at);
    }
  }

  if (oldestByUser.size > 0) {
    const userIds = [...oldestByUser.keys()];
    const { data: reminderData } = await admin
      .from("bank_import_reminders")
      .select("user_id, enabled, last_sent")
      .in("user_id", userIds);
    const reminderByUser = new Map(
      ((reminderData as BankReminder[] | null) ?? []).map((r) => [r.user_id, r])
    );

    for (const [userId, oldest] of oldestByUser) {
      const reminder = reminderByUser.get(userId);
      if (reminder?.enabled === false) continue; // user opted out
      if (reminder?.last_sent === todayUtc) continue; // already nudged today

      const days = Math.max(
        1,
        Math.floor((Date.now() - new Date(oldest).getTime()) / 86_400_000)
      );
      const result = await sendPushToUser(userId, {
        title: "Bank data is out of date",
        body: `Your accounts haven't been refreshed in ${days} days — tap to import a new export.`,
        url: "/finance/accounts",
        tag: "bank-import-stale",
      });
      bankNudges += result.sent;

      await admin
        .from("bank_import_reminders")
        .upsert(
          { user_id: userId, last_sent: todayUtc, updated_at: nowIso },
          { onConflict: "user_id" }
        );
    }
  }

  return {
    taskReminders,
    digestsSent,
    dueTasks: dueTasks.length,
    bankNudges,
    routinesMaterialized,
  };
}

export async function GET(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { data: null, error: { message: "Push is not configured." } },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const summary = await runReminders();
    return NextResponse.json({ data: summary, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Runner failed" },
      },
      { status: 500 }
    );
  }
}

// Vercel Cron issues GET; allow POST too for manual triggering.
export const POST = GET;
