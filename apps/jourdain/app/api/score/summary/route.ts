import { NextRequest } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";
import {
  computeScoreHistory,
  scoreDate,
  type ScoreTask,
} from "@/lib/scoring/compute";
import { averageScore, dayDiff, weekStartOf } from "@/lib/scoring/weeks";
import { monthStartOf } from "@/lib/scoring/months";
import type { TaskDomain, TaskStatus } from "@/entities/tasks/model/types";

const querySchema = z.object({
  // The client's local calendar day; defaults to the server's when absent.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});

type ScoreRow = {
  status: TaskStatus;
  domains: TaskDomain[] | null;
  due_date: string | null;
  occurrence_date: string | null;
};

export type ScoreSummary = {
  /** Mean day score across every tracked day, or null before any activity. */
  overall: number | null;
  daysTracked: number;
  monthAvg: number | null;
  weekAvg: number | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid query");
  }
  const today = parsed.data.date ?? format(new Date(), "yyyy-MM-dd");

  try {
    const { data, error } = await auth.supabase
      .from("tasks")
      .select("status, domains, due_date, occurrence_date");
    if (error) throw new Error(error.message);

    const tasks: ScoreTask[] = ((data as ScoreRow[]) ?? []).map((row) => ({
      status: row.status,
      domains: row.domains ?? [],
      dueDate: row.due_date,
      occurrenceDate: row.occurrence_date,
    }));

    let firstDate: string | null = null;
    for (const task of tasks) {
      const date = scoreDate(task);
      if (!date || date > today) continue;
      if (!firstDate || date < firstDate) firstDate = date;
    }

    if (!firstDate) {
      return ok<ScoreSummary>({
        overall: null,
        daysTracked: 0,
        monthAvg: null,
        weekAvg: null,
      });
    }

    const span = dayDiff(firstDate, today) + 1;
    const history = computeScoreHistory(today, span, tasks);
    const monthStart = monthStartOf(today);
    const weekStart = weekStartOf(today);

    return ok<ScoreSummary>({
      overall: averageScore(history),
      daysTracked: history.filter((day) => day.score !== null).length,
      monthAvg: averageScore(history.filter((day) => day.date >= monthStart)),
      weekAvg: averageScore(history.filter((day) => day.date >= weekStart)),
    });
  } catch (err) {
    return serverError(err, "Failed to compute score summary");
  }
}
