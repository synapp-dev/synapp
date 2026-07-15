import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as chrono from "chrono-node";
import { differenceInDays, format, parseISO } from "date-fns";
import { z } from "zod/v4";
import { requireRequestUser } from "@/lib/api/route-auth";
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
import {
  getActiveSession,
  getAllStandards,
  getExerciseBests,
  getSchedule,
  listBodyWeights,
  listExercises,
  listSessions,
} from "@/lib/gym/service";
import { G20_CATALOG } from "@/lib/gym/catalog";
import { assessLift, STRENGTH_LEVEL_META } from "@/lib/gym/standards";
import { STANDING_ORDER } from "@/lib/gym/strength-rating";
import {
  buildWorkout,
  WORKOUT_FOCUSES,
  WORKOUT_FOCUS_LABELS,
  type WorkoutCandidate,
  type WorkoutFocus,
} from "@/lib/gym/workout";
import {
  MUSCLE_SUBGROUP_LABELS,
  STATION_LABELS,
  type MuscleSubgroup,
  type Sex,
} from "@/entities/gym/model/types";
import {
  addDays,
  computeScoreHistory,
  type ScoreTask,
} from "@/lib/scoring/compute";
import {
  categoryBreakdown,
  detectRecurring,
  isSpend,
  inMonth,
  monthKey,
  monthLabel,
  round2,
  topMerchants,
} from "@/lib/finance/stats";
import {
  getFinanceTransactions,
  setTransactionCategory,
} from "@/lib/finance/service";
import { CATEGORIES } from "@/lib/finance/categorise";
import { createEntry, listEntries } from "@/lib/identity/service";
import { IDENTITY_SECTIONS } from "@/entities/identity/model/types";
import { upcomingBirthdays } from "@/lib/people/birthdays";
import { followupOverdueDays } from "@/lib/people/followups";
import type { AgentWorkoutExercise } from "@/entities/agent/model/types";
import type { AgentCard, AgentReply } from "@/entities/agent/model/types";
import type { PersonCircle } from "@/entities/people/model/types";
import type { TaskDomain, TaskStatus } from "@/entities/tasks/model/types";

export const maxDuration = 60;

// Tool calling + short text interpretation only — Haiku handles this at ~1/5
// the cost of Opus. Bump to "claude-sonnet-4-6" if inference quality slips.
const AGENT_MODEL = "claude-haiku-4-5";

// Days of history behind the score card's trend strip.
const SCORE_TREND_DAYS = 7;

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
  // The client's local calendar day; defaults to the server's when absent.
  clientDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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

// Month phrases ("May", "last month", "2026-05") to a YYYY-MM key; defaults to
// the current month when nothing was given or nothing parses.
function resolveMonthKey(phrase: string | undefined): string {
  if (!phrase) return monthKey(new Date());
  const trimmed = phrase.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = chrono.parseDate(trimmed, new Date());
  return parsed ? monthKey(parsed) : monthKey(new Date());
}

function buildSystemPrompt(): string {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekday = format(now, "EEEE");

  return `You are Jourdain, the user's personal AI operating system. You can see every module of their life app:
- Tasks and routines: to-dos, recurring reminders, push notifications.
- Life score: a daily /100 built from that day's scheduled tasks across five pillars (identity, health, work, social, finance).
- Personal CRM: people, circles, facts, birthdays, and follow-up cadences.
- Finance: imported bank transactions, categorised spend, budgets, subscriptions.
- Identity: who they want to be, in 12 sections (vision, values, standards, goals with target dates, and more).
- Gym: exercise library, programs, a weekday schedule, and logged sessions with strength ratings.

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

You track their social health beyond the CRM basics:
- get_birthdays: when the user asks whose birthday is coming up, or wants gift/planning lead time. Renders as a card; keep your text to one line.
- get_followups: when the user asks who they should catch up with, who they've been neglecting, or wants to stay on top of relationships. Renders as a card; call out the one or two most overdue people by name and stop there.

You keep their daily life score:
- get_score: when the user asks how their day, week, or life is going, how they're tracking, or about a pillar (health, work, social, finance, identity). Returns today's /100, the pillar breakdown, and a 7-day trend, rendered as a card; your text should read the story in one or two sentences (e.g. which pillar is dragging today, or that the week is trending up), not repeat the numbers.

You watch their money:
- get_spending: when the user asks what they spent, where the money went, a category or merchant total, or about a specific month. Pass the user's month words verbatim in "month" ("May", "last month"); omit for the current month. Returns the category breakdown, top merchants, and recent transactions (with ids), rendered as a card; answer the actual question in a sentence rather than reciting the rows.
- get_subscriptions: when the user asks about subscriptions, recurring payments, or what's quietly draining their account. Summarise the total annualised cost and the biggest one or two.
- set_transaction_category: when the user says a transaction is miscategorised ("that Uber charge was actually dining"). Find the transaction id via get_spending first. Set remember=true (with a short pattern like "uber") when the fix should apply to future matching transactions too.

You hold their identity work:
- add_identity_entry: when the user states a goal, value, belief, boundary, or any "who I want to be" material worth keeping. Pick the closest section; use "goals" for anything with an outcome, and pass their date words verbatim in "target_date" when a deadline was given.
- list_goals: when the user asks about their goals, what they're working toward, or how long is left on something.

You also help with the user's gym training:
- get_gym_today: when the user asks what's on at the gym today, whether they've trained, or about their schedule. Returns today's scheduled program, any session in progress, and whether they've already finished one.
- build_workout: call this when the user asks for a workout, a gym session, or what to train. It builds a Push/Pull/Legs day — a few exercises across that day's muscle groups. If the user names a day ("push day", "leg session", "back and biceps"), pass the matching focus; otherwise omit focus and let it pick. The session renders as a card, so DON'T list the exercises, weights, or sets in your text — the card already shows them. Instead, open with one or two sentences explaining the THINKING: if "weakAreas" is non-empty, say you leaned the session toward those areas because they're lagging (name one or two naturally, e.g. "your chest and triceps are lagging so I've front-loaded those"); if "needs1rm" is non-empty, add that you'll need a fresh 1RM logged on those lift(s) to track real progress. If both are empty, just give a short, encouraging one-liner about the session. When the user asks about TODAY's plan specifically, prefer get_gym_today over building a fresh workout.

When creating tasks, always categorize:
- priority: 1 = urgent/critical (words like "urgent", "asap", "must", deadlines with consequences), 2 = high, 3 = medium, 4 = default when nothing signals importance.
- domains: tag each task with the life domains it belongs to — "identity" (personal growth, values, goals, habits of self), "health" (fitness, nutrition, sleep, medical), "work" (job, projects, meetings, career), "social" (family, friends, relationships, events, birthdays), "finance" (money, bills, budget, investments, insurance, tax). A task can have multiple domains (e.g. "book dinner for mum's birthday" is social; "gym membership renewal" is health and finance). Leave domains empty only when nothing fits — it then lands in the inbox.

Style:
- Keep replies to one or two sentences. The UI renders rich cards for the data returned by your tools — never repeat full lists in your text.
- For minor ambiguities (exact wording of a task title, no due date given), pick a sensible interpretation and note it briefly rather than asking.`;
}

export async function POST(request: NextRequest) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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

  const clientDate =
    parsed.data.clientDate ?? format(new Date(), "yyyy-MM-dd");

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

  const buildWorkoutTool = betaZodTool({
    name: "build_workout",
    description:
      "Build a gym workout session for the user using a Push / Pull / Legs split — pick a few exercises across that day's muscle groups and return them as a session. Call this when the user asks for a workout, a gym session, or something to train today. The session renders as a card; don't list the exercises in your text.",
    inputSchema: z.object({
      focus: z
        .enum(WORKOUT_FOCUSES)
        .optional()
        .describe(
          'Which PPL day to build: "push" (chest, shoulders, triceps), "pull" (back, rear delts, biceps), or "legs". Omit to let the system pick one.'
        ),
    }),
    run: async (input) => {
      try {
        // SIMULATION: when no focus is named, only ever auto-pick push or pull.
        const focus: WorkoutFocus =
          input.focus ?? (Math.random() < 0.5 ? "push" : "pull");

        // Pull everything we need to both pick exercises and rate them: the
        // user's library, the benchmark tables (with images), their logged
        // bests, and their latest bodyweight.
        const [owned, standardsList, bests, bodyWeights] = await Promise.all([
          listExercises(supabase, user.id),
          getAllStandards(supabase),
          getExerciseBests(supabase, user.id),
          listBodyWeights(supabase, user.id, 1),
        ]);

        const standardsBySlug = new Map(standardsList.map((s) => [s.slug, s]));
        const bodyweight = bodyWeights[0]?.weightKg ?? null;
        const sex: Sex =
          user.user_metadata?.sex === "female" ? "female" : "male";

        // The user's own exercises carry secondary muscles; map by id so we can
        // show every muscle a movement hits, not just the block it was drawn for.
        const secondaryById = new Map<string, MuscleSubgroup[]>(
          owned.map((e) => [e.id, e.secondarySubgroups])
        );

        // Standings at or below "novice" read as "weak" — the areas we picked the
        // session to bring up.
        const WEAK_STANDINGS = new Set(["untrained", "beginner", "novice"]);
        const weakAreas = new Set<string>();
        const needs1rmNames: string[] = [];

        // Prefer the user's own exercise library (real ids → startable, rateable);
        // fall back to the starter catalog so a workout can still be built before
        // they've seeded one.
        const candidates: WorkoutCandidate[] =
          owned.length > 0
            ? owned.map((e) => ({
                name: e.name,
                subgroup: e.subgroup,
                station: e.station,
                exerciseId: e.id,
                strengthLevelSlug: e.strengthLevelSlug,
              }))
            : G20_CATALOG.map((e) => ({
                name: e.name,
                subgroup: e.subgroup,
                station: e.station,
                exerciseId: null,
                strengthLevelSlug: e.strengthLevelSlug ?? null,
              }));

        const workout = buildWorkout(candidates, focus);
        if (!workout) {
          return JSON.stringify({
            ok: false,
            error: `No exercises available for a ${focus} session.`,
          });
        }

        const exercises: AgentWorkoutExercise[] = workout.exercises.map((ex) => {
          const standards = ex.strengthLevelSlug
            ? standardsBySlug.get(ex.strengthLevelSlug)
            : undefined;
          const best = ex.exerciseId ? (bests[ex.exerciseId] ?? null) : null;
          const rows = standards ? standards[sex] : null;
          const rateable = Boolean(bodyweight && rows);

          // Primary subgroup first, then any secondaries the exercise tags.
          const secondaries = ex.exerciseId
            ? (secondaryById.get(ex.exerciseId) ?? [])
            : [];
          const muscles = [ex.subgroup, ...secondaries].map(
            (m) => MUSCLE_SUBGROUP_LABELS[m]
          );

          let strength: AgentWorkoutExercise["strength"] = null;
          if (rateable && best != null) {
            // `rateable` already guarantees a bodyweight; assert it for the type.
            const a = assessLift(rows, bodyweight!, best);
            if (a) {
              const idx = STANDING_ORDER.indexOf(a.standing);
              const progress = a.standing === "elite" ? 0 : a.progressToNext;
              strength = {
                levelLabel: STRENGTH_LEVEL_META[a.standing].label,
                color: STRENGTH_LEVEL_META[a.standing].color,
                score: Math.round(((idx + progress) / 5) * 100),
              };
              if (WEAK_STANDINGS.has(a.standing)) weakAreas.add(ex.blockLabel);
            }
          }

          // We can only chase progress on a rateable lift once there's a logged
          // 1RM to measure against — flag the gap so the card can ask for one.
          const needs1RM = ex.exerciseId != null && rateable && best == null;
          if (needs1RM) needs1rmNames.push(ex.name);

          // Suggested working weight: back the est-1RM off to the middle of the
          // target rep range (Epley), rounded to the nearest 2.5kg plate jump.
          let recommendedWeightKg: number | null = null;
          if (best != null) {
            const repsTarget = Math.round((ex.repMin + ex.repMax) / 2);
            const working = best / (1 + repsTarget / 30);
            recommendedWeightKg = Math.max(2.5, Math.round(working / 2.5) * 2.5);
          }

          return {
            exerciseId: ex.exerciseId,
            name: ex.name,
            blockLabel: ex.blockLabel,
            muscles,
            stationLabel: STATION_LABELS[ex.station],
            imageUrl: standards?.imageUrl ?? null,
            sets: ex.sets,
            repMin: ex.repMin,
            repMax: ex.repMax,
            recommendedWeightKg,
            needs1RM,
            strength,
          };
        });

        // SIMULATION: force one card into the "log a 1RM" state so the prompt is
        // always demoable. Prefer the second exercise (so a normal card shows
        // first), falling back to the only one there is.
        const FORCE_1RM_SIMULATION = true;
        if (FORCE_1RM_SIMULATION && exercises.length > 0) {
          const target = exercises[1] ?? exercises[0]!;
          target.needs1RM = true;
          target.strength = null;
          target.recommendedWeightKg = null;
          if (!needs1rmNames.includes(target.name)) {
            needs1rmNames.push(target.name);
          }
        }

        cards.push({
          type: "workout_session",
          title: workout.title,
          focusLabel: WORKOUT_FOCUS_LABELS[focus],
          exerciseIds: exercises
            .map((ex) => ex.exerciseId)
            .filter((id): id is string => id != null),
          exercises,
        });
        return JSON.stringify({
          ok: true,
          focus,
          // Weak areas this session targets, and lifts missing a fresh 1RM — so
          // the reply can explain *why* these picks and what to log.
          weakAreas: [...weakAreas],
          needs1rm: needs1rmNames,
          exercises: exercises.map((ex) => ({
            name: ex.name,
            block: ex.blockLabel,
            muscles: ex.muscles,
            sets: ex.sets,
            reps: `${ex.repMin}-${ex.repMax}`,
            level: ex.needs1RM ? "no 1RM logged" : ex.strength?.levelLabel ?? "unrated",
            recommendedKg: ex.recommendedWeightKg,
          })),
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "build workout failed",
        });
      }
    },
  });

  const getScoreTool = betaZodTool({
    name: "get_score",
    description:
      "Get today's life score out of 100, the five-pillar breakdown, and the 7-day trend. Call this when the user asks how their day, week, or life is going.",
    inputSchema: z.object({}),
    run: async () => {
      try {
        const endDate = clientDate;
        const startDate = addDays(endDate, -(SCORE_TREND_DAYS - 1));
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

        const tasks: ScoreTask[] = (
          (data as {
            status: TaskStatus;
            domains: TaskDomain[] | null;
            due_date: string | null;
            occurrence_date: string | null;
          }[]) ?? []
        ).map((row) => ({
          status: row.status,
          domains: row.domains ?? [],
          dueDate: row.due_date,
          occurrenceDate: row.occurrence_date,
        }));

        const history = computeScoreHistory(endDate, SCORE_TREND_DAYS, tasks);
        const today = history.at(-1)!;
        cards.push({
          type: "score",
          title: "Today's score",
          date: today.date,
          score: today.score,
          pillars: today.pillars,
          trend: history.map((day) => ({ date: day.date, score: day.score })),
        });
        return JSON.stringify({
          ok: true,
          today,
          trend: history.map((day) => ({ date: day.date, score: day.score })),
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "score failed",
        });
      }
    },
  });

  const getSpendingTool = betaZodTool({
    name: "get_spending",
    description:
      "Get spending for one month: total, per-category breakdown, top merchants, and recent transactions with ids. Call this when the user asks what they spent, where the money went, or about a merchant or category.",
    inputSchema: z.object({
      month: z
        .string()
        .max(50)
        .optional()
        .describe(
          'The user\'s month words verbatim, e.g. "May", "last month", "2026-05". Omit for the current month.'
        ),
    }),
    run: async (input) => {
      try {
        const key = resolveMonthKey(input.month);
        const transactions = await getFinanceTransactions(user.id);
        const categories = categoryBreakdown(transactions, key);
        const merchants = topMerchants(transactions, key);
        const total = round2(
          categories.reduce((sum, entry) => sum + entry.total, 0)
        );
        const recent = transactions
          .filter((t) => isSpend(t) && inMonth(t, key))
          .slice(0, 25)
          .map((t) => ({
            id: t.id,
            date: t.date,
            amount: round2(-t.amount),
            description: t.description,
            category: t.category,
          }));
        const label = monthLabel(key, "long");
        cards.push({
          type: "spending",
          title: `Spending in ${label}`,
          monthLabel: label,
          total,
          categories,
          merchants,
        });
        return JSON.stringify({
          ok: true,
          month: key,
          total,
          categories,
          merchants,
          recentTransactions: recent,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "spending failed",
        });
      }
    },
  });

  const getSubscriptionsTool = betaZodTool({
    name: "get_subscriptions",
    description:
      "Detect recurring payments (subscriptions, memberships, bills) from the user's transactions, with cadence and annualised cost. Call this when the user asks about subscriptions or recurring charges.",
    inputSchema: z.object({}),
    run: async () => {
      try {
        const transactions = await getFinanceTransactions(user.id);
        const recurring = detectRecurring(transactions);
        const totalAnnualised = round2(
          recurring.reduce((sum, entry) => sum + entry.annualised, 0)
        );
        return JSON.stringify({
          ok: true,
          count: recurring.length,
          totalAnnualised,
          recurring,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "subscriptions failed",
        });
      }
    },
  });

  const setTransactionCategoryTool = betaZodTool({
    name: "set_transaction_category",
    description:
      "Recategorise one transaction. Requires the transaction id from get_spending. Set remember=true with a short pattern to also save a rule and fix every other matching transaction.",
    inputSchema: z.object({
      transaction_id: z.uuid().describe("The transaction id from get_spending"),
      category: z.enum(CATEGORIES),
      remember: z
        .boolean()
        .optional()
        .describe("true to save a rule so future matches get this category"),
      pattern: z
        .string()
        .max(100)
        .optional()
        .describe(
          'Substring the rule matches on, e.g. "uber eats". Required when remember is true.'
        ),
    }),
    run: async (input) => {
      try {
        const pattern = input.remember ? input.pattern?.trim() : undefined;
        if (input.remember && !pattern) {
          return JSON.stringify({
            ok: false,
            error: "remember=true needs a pattern",
          });
        }
        const result = await setTransactionCategory(
          user.id,
          input.transaction_id,
          input.category,
          pattern
        );
        return JSON.stringify({ ok: true, updated: result.updated });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "recategorise failed",
        });
      }
    },
  });

  const addIdentityEntryTool = betaZodTool({
    name: "add_identity_entry",
    description:
      "Add an entry to the user's identity document (vision, values, goals, and more). Call this when the user states a goal, value, belief, or boundary worth keeping.",
    inputSchema: z.object({
      section: z.enum(IDENTITY_SECTIONS),
      title: z.string().min(1).max(300).describe("Short headline for the entry"),
      body: z.string().max(5000).optional().describe("Longer detail, if any"),
      target_date: z
        .string()
        .max(100)
        .optional()
        .describe(
          'For goals with a deadline: the user\'s date words verbatim, e.g. "end of the year", "June 20". Do not calculate dates yourself.'
        ),
    }),
    run: async (input) => {
      try {
        const targetDate =
          input.section === "goals" ? resolveDueDate(input.target_date) : null;
        const entry = await createEntry(supabase, user.id, {
          section: input.section,
          title: input.title,
          body: input.body ?? null,
          extras: targetDate ? { targetDate } : {},
        });
        return JSON.stringify({ ok: true, entry });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "add entry failed",
        });
      }
    },
  });

  const listGoalsTool = betaZodTool({
    name: "list_goals",
    description:
      "List the user's open identity goals with days remaining to their target dates. Call this when the user asks about their goals or what they're working toward.",
    inputSchema: z.object({}),
    run: async () => {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const goals = (await listEntries(supabase, "goals"))
          .filter((entry) => !entry.extras.done)
          .map((entry) => ({
            id: entry.id,
            title: entry.title,
            body: entry.body,
            targetDate: entry.extras.targetDate ?? null,
            daysLeft: entry.extras.targetDate
              ? differenceInDays(
                  parseISO(entry.extras.targetDate),
                  parseISO(today)
                )
              : null,
          }));
        return JSON.stringify({ ok: true, count: goals.length, goals });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "list goals failed",
        });
      }
    },
  });

  const getBirthdaysTool = betaZodTool({
    name: "get_birthdays",
    description:
      "Get the next upcoming birthdays among the user's people. Call this when the user asks whose birthday is coming up.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("How many to return; defaults to 5"),
    }),
    run: async (input) => {
      try {
        const people = await listPeople(supabase, {});
        const entries = upcomingBirthdays(people)
          .slice(0, input.limit ?? 5)
          .map((entry) => ({
            person: entry.person,
            date: format(entry.date, "yyyy-MM-dd"),
            daysAway: entry.daysAway,
            turns: entry.turns,
          }));
        cards.push({
          type: "birthday_list",
          title: "Upcoming birthdays",
          entries,
        });
        return JSON.stringify({
          ok: true,
          count: entries.length,
          birthdays: entries.map((entry) => ({
            name: entry.person.fullName,
            date: entry.date,
            daysAway: entry.daysAway,
            turns: entry.turns,
          })),
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "birthdays failed",
        });
      }
    },
  });

  const getFollowupsTool = betaZodTool({
    name: "get_followups",
    description:
      "Get the people most overdue for a catch-up, based on each person's touch-base cadence. Call this when the user asks who they should reach out to or who they've been neglecting.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("How many to return; defaults to 5"),
    }),
    run: async (input) => {
      try {
        const people = await listPeople(supabase, {});
        const entries = people
          .map((person) => ({ person, overdue: followupOverdueDays(person) }))
          .filter((entry) => entry.overdue !== null && entry.overdue > 0)
          .sort((a, b) => (b.overdue ?? 0) - (a.overdue ?? 0))
          .slice(0, input.limit ?? 5)
          .map((entry) => ({
            person: entry.person,
            overdueDays: Number.isFinite(entry.overdue)
              ? (entry.overdue as number)
              : null,
          }));
        cards.push({
          type: "followup_list",
          title: "Overdue catch-ups",
          entries,
        });
        return JSON.stringify({
          ok: true,
          count: entries.length,
          followups: entries.map((entry) => ({
            name: entry.person.fullName,
            overdueDays: entry.overdueDays,
            neverContacted: entry.person.lastTouchAt === null,
            lastTouchAt: entry.person.lastTouchAt,
          })),
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "followups failed",
        });
      }
    },
  });

  const getGymTodayTool = betaZodTool({
    name: "get_gym_today",
    description:
      "Get today's gym state: the scheduled program (if any), a session in progress, and whether a session was already completed today. Call this when the user asks what's on at the gym today or whether they've trained.",
    inputSchema: z.object({}),
    run: async () => {
      try {
        const today = clientDate;
        const [schedule, active, sessions] = await Promise.all([
          getSchedule(supabase, user.id),
          getActiveSession(supabase, user.id),
          listSessions(supabase, user.id, 20),
        ]);
        // Parse at local noon so the weekday can't slip a day at DST edges.
        const day = schedule.days[new Date(`${today}T12:00:00`).getDay()];
        const completedToday = sessions.filter(
          (session) =>
            session.performedOn === today && session.status === "completed"
        );
        return JSON.stringify({
          ok: true,
          date: today,
          scheduledProgram: day?.programName ?? null,
          scheduledMuscleGroups: day?.muscleGroups ?? [],
          activeSession: active
            ? {
                id: active.id,
                title: active.title,
                startedAt: active.startedAt,
                exercises: active.exercises.map((ex) => ex.exerciseName),
              }
            : null,
          completedToday: completedToday.map((session) => ({
            title: session.title,
            setCount: session.setCount,
          })),
          done: completedToday.length > 0,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "gym today failed",
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
        buildWorkoutTool,
        getScoreTool,
        getSpendingTool,
        getSubscriptionsTool,
        setTransactionCategoryTool,
        addIdentityEntryTool,
        listGoalsTool,
        getBirthdaysTool,
        getFollowupsTool,
        getGymTodayTool,
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
