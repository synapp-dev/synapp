import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { z } from "zod/v4";
import { createServerClient } from "@/utils/supabase/server";
import { createTask, listTasks, updateTask } from "@/lib/tasks/service";
import {
  appendPersonFacts,
  createPerson,
  getPerson,
  listPeople,
} from "@/lib/people/service";
import { syncTaskCalendarEvent } from "@/lib/google/task-sync";
import { getGmailContext } from "@/lib/google/client";
import { listPersonEmailThreads } from "@/lib/google/gmail";
import type { AgentCard, AgentReply } from "@/entities/agent/model/types";
import type { PersonCircle } from "@/entities/people/model/types";

export const maxDuration = 60;

// Tool calling + short text interpretation only — Haiku handles this at ~1/5
// the cost of Opus. Bump to "claude-sonnet-4-6" if inference quality slips.
const AGENT_MODEL = "claude-haiku-4-5";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
});

// Deterministic natural-language date resolution — the model passes the user's
// date words verbatim; we parse them server-side so weekday math never varies.
function resolveDueDate(phrase: string | undefined): string | null {
  if (!phrase) return null;
  const trimmed = phrase.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = chrono.parseDate(trimmed, new Date(), { forwardDate: true });
  return parsed ? format(parsed, "yyyy-MM-dd") : null;
}

// Reminders need a precise moment (date AND time), not just a calendar day, so
// the cron runner can push exactly when it arrives. We keep chrono's full
// timestamp instead of truncating to a date like resolveDueDate does. Note:
// time-of-day words ("5pm") are interpreted in the SERVER's timezone — UTC on
// Vercel — until per-user timezones are threaded through here.
function resolveRemindAt(phrase: string | undefined): string | null {
  if (!phrase) return null;
  const parsed = chrono.parseDate(phrase.trim(), new Date(), {
    forwardDate: true,
  });
  return parsed ? parsed.toISOString() : null;
}

// Birthday phrases ("9 March", "March 9 1992") → month/day, year only when stated.
function resolveBirthday(phrase: string | undefined): {
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
} {
  if (!phrase) {
    return { birthdayMonth: null, birthdayDay: null, birthdayYear: null };
  }
  const results = chrono.parse(phrase.trim(), new Date());
  const start = results[0]?.start;
  if (!start) {
    return { birthdayMonth: null, birthdayDay: null, birthdayYear: null };
  }
  return {
    birthdayMonth: start.get("month"),
    birthdayDay: start.get("day"),
    birthdayYear: start.isCertain("year") ? start.get("year") : null,
  };
}

function buildSystemPrompt(): string {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekday = format(now, "EEEE");

  return `You are Jourdain, the user's personal AI operating system. Right now you manage their tasks; more life domains (health, finance, social) are coming.

Today's date is ${today} (${weekday}).

Tool guidance:
- create_task: call this when the user asks to add, remember, schedule, or be reminded of something actionable. When the user mentions a due day, pass their date words verbatim in "due" (e.g. "tomorrow", "next Wednesday", "June 20") — do not convert or calculate dates yourself. When the user wants to be reminded or notified AT A SPECIFIC TIME (a push to their phone), also pass their reminder words verbatim in "remind", including the time (e.g. "tomorrow at 5pm", "in 2 hours"). Use "remind" only when they actually asked to be reminded/notified at a time, not for every dated task.
- list_tasks: call this when the user asks what's on their plate, what's due or overdue, or before completing a task you only know by name.
- complete_task: call this when the user says they finished or did something. If you only know the task by title, call list_tasks first to find its id.
- set_reminder: call this to add, change, or clear the push reminder on a task the user ALREADY has (e.g. "remind me about the dentist task at 3pm", "move my call-mum reminder to tomorrow morning"). Find the task id with list_tasks first if you only know its title.

You also keep the user's personal CRM — people in their life, grouped into circles (work, friends, family):
- find_person: ALWAYS call this first when the user mentions someone by name, to get their id and profile.
- create_person: when the user mentions someone new worth remembering. Pass birthday words verbatim in "birthday" if given.
- log_person_fact: when the user shares something about a person — life events, things they like, updates. Set mark_touch=true when the user actually interacted with them (caught up, called, saw them). Put durable hobbies/likes in "interests" as well.
- list_people: when the user asks who's in a circle or about their relationships.
- get_person_emails: when the user asks about email with someone — recent threads, what a contact said, or what they're waiting on. Call find_person first to get the id, then summarise the threads in a sentence or two; don't dump them verbatim.
If the user shares a fact about someone who doesn't exist yet, create them first, then log the fact. Don't ask permission for this — capturing people-context silently is your job.

When creating tasks, always categorize:
- priority: 1 = urgent/critical (words like "urgent", "asap", "must", deadlines with consequences), 2 = high, 3 = medium, 4 = default when nothing signals importance.
- domains: tag each task with the life domains it belongs to — "identity" (personal growth, values, goals, habits of self), "health" (fitness, nutrition, sleep, medical), "work" (job, projects, meetings, career), "social" (family, friends, relationships, events, birthdays), "finance" (money, bills, budget, investments, insurance, tax). A task can have multiple domains (e.g. "book dinner for mum's birthday" is social; "gym membership renewal" is health and finance). Leave domains empty only when nothing fits — it then lands in the inbox.

Style:
- Keep replies to one or two sentences. The UI renders rich cards for task data returned by your tools — never repeat full task lists in your text.
- For minor ambiguities (exact wording of a task title, no due date given), pick a sensible interpretation and note it briefly rather than asking.`;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "ANTHROPIC_API_KEY is not configured on the server." },
      },
      { status: 503 }
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const cards: AgentCard[] = [];

  const createTaskTool = betaZodTool({
    name: "create_task",
    description:
      "Create a task for the user. Call this when the user asks to add, remember, schedule, or be reminded of something actionable.",
    inputSchema: z.object({
      title: z.string().min(1).max(500).describe("Short imperative task title"),
      due: z
        .string()
        .max(100)
        .optional()
        .describe(
          'The user\'s timing words, verbatim — e.g. "tomorrow", "next Wednesday", "June 20". Omit if no timing was given. Do not calculate dates yourself.'
        ),
      remind: z
        .string()
        .max(100)
        .optional()
        .describe(
          'When the user wants a push notification at a specific time, their reminder words verbatim INCLUDING the time — e.g. "tomorrow at 5pm", "in 2 hours", "June 20 at 9am". Omit unless the user asked to be reminded/notified at a time. Do not calculate this yourself.'
        ),
      notes: z.string().max(5000).optional().describe("Extra detail, if any"),
      priority: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe(
          "1 = urgent, 2 = high, 3 = medium, 4 = default. Infer from the user's language; use 4 when nothing signals importance."
        ),
      domains: z
        .array(z.enum(["identity", "health", "work", "social", "finance"]))
        .optional()
        .describe(
          "Life domains this task belongs to. Multiple allowed. Omit only if nothing fits."
        ),
    }),
    run: async (input) => {
      try {
        const task = await createTask(supabase, user.id, {
          title: input.title,
          dueDate: resolveDueDate(input.due),
          remindAt: resolveRemindAt(input.remind),
          notes: input.notes ?? null,
          priority: (input.priority as 1 | 2 | 3 | 4 | undefined) ?? 4,
          domains: input.domains ?? [],
        });
        await syncTaskCalendarEvent(user.id, task);
        cards.push({ type: "task_created", task });
        return JSON.stringify({ ok: true, task });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "create failed",
        });
      }
    },
  });

  const listTasksTool = betaZodTool({
    name: "list_tasks",
    description:
      "List the user's tasks. Call this when the user asks what's on their plate, what's due or overdue, or when you need to find a task's id by its title.",
    inputSchema: z.object({
      status: z
        .enum(["open", "done", "all"])
        .optional()
        .describe("Filter by status; defaults to open"),
    }),
    run: async (input) => {
      try {
        const status = input.status === "all" ? undefined : (input.status ?? "open");
        const tasks = await listTasks(supabase, { status });
        const title =
          status === "done"
            ? "Completed tasks"
            : status === "open"
              ? "Open tasks"
              : "All tasks";
        cards.push({ type: "task_list", title, tasks });
        return JSON.stringify({ ok: true, count: tasks.length, tasks });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "list failed",
        });
      }
    },
  });

  const completeTaskTool = betaZodTool({
    name: "complete_task",
    description:
      "Mark a task as done. Call this when the user says they finished or did something. Requires the task id — call list_tasks first if you only know the title.",
    inputSchema: z.object({
      task_id: z.uuid().describe("The id of the task to complete"),
    }),
    run: async (input) => {
      try {
        const task = await updateTask(supabase, input.task_id, { status: "done" });
        await syncTaskCalendarEvent(user.id, task);
        cards.push({ type: "task_completed", task });
        return JSON.stringify({ ok: true, task });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "complete failed",
        });
      }
    },
  });

  const setReminderTool = betaZodTool({
    name: "set_reminder",
    description:
      "Set or change the push-notification reminder time on an existing task. Call this when the user asks to be reminded/notified about a task they already have, or wants to move a reminder. Requires the task id — call list_tasks first if you only know the title. Pass an empty string for `remind` to clear the reminder.",
    inputSchema: z.object({
      task_id: z.uuid().describe("The id of the task to remind about"),
      remind: z
        .string()
        .max(100)
        .describe(
          'The reminder words verbatim INCLUDING the time — e.g. "tomorrow at 5pm", "in 2 hours", "June 20 at 9am". Pass an empty string to clear the reminder. Do not calculate this yourself.'
        ),
    }),
    run: async (input) => {
      try {
        const task = await updateTask(supabase, input.task_id, {
          remindAt: input.remind.trim() ? resolveRemindAt(input.remind) : null,
        });
        cards.push({ type: "task_list", title: "Reminder set", tasks: [task] });
        return JSON.stringify({ ok: true, task });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "set reminder failed",
        });
      }
    },
  });

  const findPersonTool = betaZodTool({
    name: "find_person",
    description:
      "Look up people by name or nickname. ALWAYS call this first when the user mentions someone by name, to get their id and existing profile.",
    inputSchema: z.object({
      query: z.string().min(1).max(200).describe("Name or partial name"),
    }),
    run: async (input) => {
      try {
        const people = await listPeople(supabase, { search: input.query });
        return JSON.stringify({ ok: true, count: people.length, people });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "find failed",
        });
      }
    },
  });

  const createPersonTool = betaZodTool({
    name: "create_person",
    description:
      "Add a person to the user's life. Call when they mention someone new worth remembering.",
    inputSchema: z.object({
      full_name: z.string().min(1).max(200),
      nickname: z.string().max(100).optional(),
      circles: z
        .array(z.enum(["work", "friends", "family"]))
        .optional()
        .describe("Which circles they belong to; multiple allowed"),
      birthday: z
        .string()
        .max(100)
        .optional()
        .describe('Birthday words verbatim, e.g. "9 March" or "March 9 1992"'),
      emails: z.array(z.string().email()).max(10).optional(),
      phone: z.string().max(50).optional(),
      company: z.string().max(200).optional(),
      role: z.string().max(200).optional(),
      interests: z.array(z.string().max(100)).max(50).optional(),
      bio: z.string().max(5000).optional().describe("One line on who they are to the user"),
    }),
    run: async (input) => {
      try {
        const birthday = resolveBirthday(input.birthday);
        const person = await createPerson(supabase, user.id, {
          fullName: input.full_name,
          nickname: input.nickname ?? null,
          circles: (input.circles as PersonCircle[] | undefined) ?? [],
          ...birthday,
          emails: input.emails ?? [],
          phone: input.phone ?? null,
          company: input.company ?? null,
          role: input.role ?? null,
          interests: input.interests ?? [],
          bio: input.bio ?? null,
        });
        cards.push({ type: "person_profile", title: "Person added", person });
        return JSON.stringify({ ok: true, person });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "create failed",
        });
      }
    },
  });

  const logPersonFactTool = betaZodTool({
    name: "log_person_fact",
    description:
      "Store something the user shared about a person — life events, things they like, updates. Requires the person id from find_person.",
    inputSchema: z.object({
      person_id: z.uuid(),
      fact: z
        .string()
        .max(1000)
        .optional()
        .describe("The fact to remember, written in third person"),
      interests: z
        .array(z.string().max(100))
        .max(20)
        .optional()
        .describe("Durable hobbies/likes to add to their interests"),
      mark_touch: z
        .boolean()
        .optional()
        .describe("true when the user actually interacted with this person"),
    }),
    run: async (input) => {
      try {
        const person = await appendPersonFacts(supabase, input.person_id, {
          facts: input.fact ? [input.fact] : undefined,
          interests: input.interests,
          markTouch: input.mark_touch ?? false,
        });
        cards.push({ type: "person_profile", title: "Profile updated", person });
        return JSON.stringify({ ok: true, person });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "log failed",
        });
      }
    },
  });

  const listPeopleTool = betaZodTool({
    name: "list_people",
    description:
      "List the user's people, optionally filtered to one circle. Call when they ask who's in their life or about staying in touch.",
    inputSchema: z.object({
      circle: z.enum(["work", "friends", "family"]).optional(),
    }),
    run: async (input) => {
      try {
        const people = await listPeople(supabase, {
          circle: input.circle as PersonCircle | undefined,
        });
        const title = input.circle
          ? `${input.circle.charAt(0).toUpperCase()}${input.circle.slice(1)}`
          : "Everyone";
        cards.push({ type: "people_list", title, people });
        return JSON.stringify({ ok: true, count: people.length, people });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "list failed",
        });
      }
    },
  });

  const getPersonEmailsTool = betaZodTool({
    name: "get_person_emails",
    description:
      "Read the user's recent Gmail threads with a specific person. Call when the user asks about emails from someone, what a contact said, or what they're waiting on. Requires the person id from find_person.",
    inputSchema: z.object({
      person_id: z.uuid(),
    }),
    run: async (input) => {
      try {
        const person = await getPerson(supabase, input.person_id);
        if (!person) {
          return JSON.stringify({ ok: false, error: "person not found" });
        }
        if (person.emails.length === 0) {
          return JSON.stringify({
            ok: true,
            count: 0,
            note: "no email address on file for this person",
            threads: [],
          });
        }
        const context = await getGmailContext(user.id);
        if (!context) {
          return JSON.stringify({
            ok: false,
            error: "the user's Google account is not connected",
          });
        }
        const threads = await listPersonEmailThreads(
          context.gmail,
          person.emails
        );
        return JSON.stringify({ ok: true, count: threads.length, threads });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "email lookup failed",
        });
      }
    },
  });

  try {
    const anthropic = new Anthropic();
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: AGENT_MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      tools: [
        createTaskTool,
        listTasksTool,
        completeTaskTool,
        setReminderTool,
        findPersonTool,
        createPersonTool,
        logPersonFactTool,
        listPeopleTool,
        getPersonEmailsTool,
      ],
      messages: parsed.data.messages.map((message) => ({
        role: message.role,
        content: message.text,
      })),
    });

    const text = finalMessage.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n");

    const reply: AgentReply = { text, cards };
    return NextResponse.json({ data: reply, error: null });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Agent error (${err.status}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "Agent request failed";
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    );
  }
}
