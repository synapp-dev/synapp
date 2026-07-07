import { NextRequest } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { badRequest, ok, requireUser } from "@/lib/gym/http";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSchedule, listSessions } from "@/lib/gym/service";
import { listPeople } from "@/lib/people/service";
import { upcomingBirthdays } from "@/lib/people/birthdays";
import { isFollowupOverdue } from "@/lib/people/followups";
import { computeDayScore, type ScoreTask } from "@/lib/scoring/compute";
import type { AgentSuggestionChip } from "@/entities/agent/model/types";
import type { TaskDomain, TaskStatus } from "@/entities/tasks/model/types";

const MAX_CHIPS = 4;
const UNCATEGORISED_THRESHOLD = 10;
const BIRTHDAY_WINDOW_DAYS = 3;
const LOW_SCORE_THRESHOLD = 50;
const MIDDAY_HOUR = 12;

// The welcome screen's resting set, also the client-side fallback while this
// route loads (or fails).
const FALLBACK_CHIPS: AgentSuggestionChip[] = [
  {
    label: "What's my Uber Eats spend?",
    prompt: "What's my Uber Eats spend?",
    icon: "utensils-crossed",
    tone: "amber",
  },
  {
    label: "Give me a gym workout session",
    prompt: "Give me a gym workout session",
    icon: "dumbbell",
    tone: "emerald",
  },
  {
    label: "Break down my sleep this week",
    prompt: "Break down my sleep this week",
    icon: "moon",
    tone: "indigo",
  },
];

type TaskRow = {
  status: TaskStatus;
  domains: TaskDomain[] | null;
  due_date: string | null;
  occurrence_date: string | null;
};

const querySchema = z.object({
  // The client's local calendar day; defaults to the server's when absent.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, userId } = auth;

  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid query");
  }

  const now = new Date();
  const today = parsed.data.date ?? format(now, "yyyy-MM-dd");
  // Parse at local noon so the derived weekday can't slip a day at DST edges.
  const dayIndex = new Date(`${today}T12:00:00`).getDay();

  try {
    const admin = createAdminClient();
    const [schedule, sessions, people, uncatRes, taskRes] = await Promise.all([
      getSchedule(supabase, userId).catch(() => null),
      listSessions(supabase, userId, 10).catch(() => []),
      listPeople(supabase).catch(() => []),
      admin
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .or("category.is.null,category.eq.other"),
      supabase
        .from("tasks")
        .select("status, domains, due_date, occurrence_date")
        .or(
          `occurrence_date.eq.${today},and(occurrence_date.is.null,due_date.eq.${today})`
        ),
    ]);

    const chips: AgentSuggestionChip[] = [];

    // Gym scheduled today and not yet done.
    const scheduledToday = schedule?.days[dayIndex]?.programId ?? null;
    const doneToday = sessions.some(
      (session) =>
        session.performedOn === today && session.status === "completed"
    );
    if (scheduledToday && !doneToday) {
      chips.push({
        label: "What's my session today?",
        prompt: "What's my gym session today?",
        icon: "dumbbell",
        tone: "emerald",
      });
    }

    // A backlog of uncategorised (or unmatched) transactions.
    if ((uncatRes.count ?? 0) > UNCATEGORISED_THRESHOLD) {
      chips.push({
        label: "Categorise my spending",
        prompt: "Help me categorise my recent spending",
        icon: "tags",
        tone: "amber",
      });
    }

    // Overdue follow-ups.
    if (people.some((person) => isFollowupOverdue(person))) {
      chips.push({
        label: "Who should I catch up with?",
        prompt: "Who should I catch up with?",
        icon: "hand-heart",
        tone: "violet",
      });
    }

    // Score is dragging by mid-day.
    const tasks: ScoreTask[] = ((taskRes.data as TaskRow[] | null) ?? []).map(
      (row) => ({
        status: row.status,
        domains: row.domains ?? [],
        dueDate: row.due_date,
        occurrenceDate: row.occurrence_date,
      })
    );
    const dayScore = computeDayScore(today, tasks);
    if (
      now.getHours() >= MIDDAY_HOUR &&
      dayScore.score !== null &&
      dayScore.score < LOW_SCORE_THRESHOLD
    ) {
      chips.push({
        label: "How's my day looking?",
        prompt: "How's my day looking?",
        icon: "gauge",
        tone: "sky",
      });
    }

    // A birthday inside the next few days.
    const soon = upcomingBirthdays(people, now).find(
      (entry) => entry.daysAway <= BIRTHDAY_WINDOW_DAYS
    );
    if (soon) {
      const firstName = soon.person.fullName.split(/\s+/)[0];
      chips.push({
        label:
          soon.daysAway === 0
            ? `It's ${firstName}'s birthday today`
            : `${firstName}'s birthday is coming up`,
        prompt: `Tell me about ${soon.person.fullName}'s upcoming birthday`,
        icon: "cake",
        tone: "pink",
      });
    }

    // Top up with fallbacks, skipping any that duplicate a live chip's icon.
    const usedIcons = new Set(chips.map((chip) => chip.icon));
    for (const fallback of FALLBACK_CHIPS) {
      if (chips.length >= MAX_CHIPS) break;
      if (usedIcons.has(fallback.icon)) continue;
      chips.push(fallback);
      usedIcons.add(fallback.icon);
    }

    return ok<AgentSuggestionChip[]>(chips.slice(0, MAX_CHIPS));
  } catch {
    // Suggestions are decorative; never fail the welcome screen over them.
    return ok<AgentSuggestionChip[]>(FALLBACK_CHIPS);
  }
}
