import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, notFound, ok, requireUser, serverError } from "@/lib/gym/http";
import { getTask, updateTask } from "@/lib/tasks/service";
import { syncTaskCalendarEvent } from "@/lib/google/task-sync";
import type { UpdateTaskInput } from "@/entities/tasks/model/types";

const respondSchema = z
  .object({
    taskId: z.string().uuid(),
    answer: z.enum(["did", "missed", "move_today", "drop", "not_yet"]),
    clientDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
      .optional(),
    completedTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm")
      .optional(),
  })
  .refine((value) => value.answer !== "move_today" || Boolean(value.clientDate), {
    message: "clientDate is required for move_today",
  });

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = respondSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }
  const { taskId, answer, clientDate, completedTime } = parsed.data;

  try {
    const existing = await getTask(auth.supabase, taskId);
    if (!existing) return notFound();

    // "not_yet" leaves the task open for later without touching status.
    if (answer === "not_yet") return ok(existing);

    // "did" flips the status only; scoring buckets by occurrence/due date, so
    // the credit lands on the scheduled day, not on when it was confirmed.
    const input: UpdateTaskInput =
      answer === "did"
        ? { status: "done", ...(completedTime ? { loggedTime: completedTime } : {}) }
        : answer === "missed"
          ? { status: "missed" }
          : answer === "drop"
            ? { status: "skipped" }
            : { dueDate: clientDate };

    const task = await updateTask(auth.supabase, taskId, input);
    await syncTaskCalendarEvent(auth.userId, task);
    return ok(task);
  } catch (err) {
    return serverError(err, "Failed to record answer");
  }
}
