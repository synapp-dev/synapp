import { addDays, format, parseISO } from "date-fns";
import { getCalendarContext } from "@/lib/google/client";
import type { Task } from "@/entities/tasks/model/types";

/**
 * One-way push: Jourdain is the source of truth for tasks. Open tasks with a
 * due date appear as all-day events on the "Jourdain" secondary calendar,
 * tagged with the task id; completed/unscheduled/deleted tasks are removed.
 * Failures are swallowed — calendar sync must never break task operations.
 */
export async function syncTaskCalendarEvent(
  userId: string,
  task: Task
): Promise<void> {
  try {
    const context = await getCalendarContext(userId);
    const calendarId = context?.connection.jourdain_calendar_id;
    if (!context || !calendarId) return;

    const existing = await context.calendar.events.list({
      calendarId,
      privateExtendedProperty: [`jourdainTaskId=${task.id}`],
      maxResults: 1,
    });
    const existingId = existing.data.items?.[0]?.id ?? null;

    const shouldExist = task.status === "open" && Boolean(task.dueDate);
    if (!shouldExist) {
      if (existingId) {
        await context.calendar.events.delete({ calendarId, eventId: existingId });
      }
      return;
    }

    const dueDate = task.dueDate as string;
    const requestBody = {
      summary: task.title,
      description: task.notes ?? undefined,
      start: { date: dueDate },
      end: { date: format(addDays(parseISO(dueDate), 1), "yyyy-MM-dd") },
      extendedProperties: { private: { jourdainTaskId: task.id } },
    };

    if (existingId) {
      await context.calendar.events.update({
        calendarId,
        eventId: existingId,
        requestBody,
      });
    } else {
      await context.calendar.events.insert({ calendarId, requestBody });
    }
  } catch (err) {
    console.warn(
      "[google-sync] task sync failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function removeTaskCalendarEvent(
  userId: string,
  taskId: string
): Promise<void> {
  try {
    const context = await getCalendarContext(userId);
    const calendarId = context?.connection.jourdain_calendar_id;
    if (!context || !calendarId) return;

    const existing = await context.calendar.events.list({
      calendarId,
      privateExtendedProperty: [`jourdainTaskId=${taskId}`],
      maxResults: 1,
    });
    const existingId = existing.data.items?.[0]?.id;
    if (existingId) {
      await context.calendar.events.delete({ calendarId, eventId: existingId });
    }
  } catch (err) {
    console.warn(
      "[google-sync] task event removal failed:",
      err instanceof Error ? err.message : err
    );
  }
}
