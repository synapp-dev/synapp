import { NextRequest } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";
import {
  addDays,
  computeScoreHistory,
  type DayScore,
  type ScoreTask,
} from "@/lib/scoring/compute";
import { dayDiff } from "@/lib/scoring/weeks";
import type { TaskDomain, TaskStatus } from "@/entities/tasks/model/types";

const HISTORY_DAYS = 30;
const RANGE_CAP_DAYS = 92;

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dates must be YYYY-MM-DD");

const querySchema = z.object({
  // The client's local calendar day; defaults to the server's when absent.
  date: dateField.optional(),
  // Explicit range mode: both bounds inclusive, returns DayScore[].
  from: dateField.optional(),
  to: dateField.optional(),
});

type ScoreRow = {
  status: TaskStatus;
  domains: TaskDomain[] | null;
  due_date: string | null;
  occurrence_date: string | null;
};

export type ScoreResponse = { today: DayScore; history: DayScore[] };

async function fetchScoreTasks(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<ScoreTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("status, domains, due_date, occurrence_date")
    .or(
      [
        `and(occurrence_date.gte.${startDate},occurrence_date.lte.${endDate})`,
        `and(occurrence_date.is.null,due_date.gte.${startDate},due_date.lte.${endDate})`,
      ].join(",")
    );
  if (error) throw new Error(error.message);

  return ((data as ScoreRow[]) ?? []).map((row) => ({
    status: row.status,
    domains: row.domains ?? [],
    dueDate: row.due_date,
    occurrenceDate: row.occurrence_date,
  }));
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    date: params.get("date") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid query");
  }

  const { from, to } = parsed.data;
  if ((from === undefined) !== (to === undefined)) {
    return badRequest("from and to must be provided together");
  }

  if (from !== undefined && to !== undefined) {
    const span = dayDiff(from, to) + 1;
    if (span < 1) return badRequest("from must be on or before to");
    if (span > RANGE_CAP_DAYS) {
      return badRequest(`Range cannot exceed ${RANGE_CAP_DAYS} days`);
    }

    try {
      const tasks = await fetchScoreTasks(auth.supabase, from, to);
      return ok<DayScore[]>(computeScoreHistory(to, span, tasks));
    } catch (err) {
      return serverError(err, "Failed to compute score range");
    }
  }

  const endDate = parsed.data.date ?? format(new Date(), "yyyy-MM-dd");
  const startDate = addDays(endDate, -(HISTORY_DAYS - 1));

  try {
    const tasks = await fetchScoreTasks(auth.supabase, startDate, endDate);
    const history = computeScoreHistory(endDate, HISTORY_DAYS, tasks);
    const today = history.at(-1)!;
    return ok<ScoreResponse>({ today, history });
  } catch (err) {
    return serverError(err, "Failed to compute score");
  }
}
