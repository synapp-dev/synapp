import type { Task, TaskDomain } from "@/entities/tasks/model/types";
import type { Person } from "@/entities/people/model/types";

/** Current standing on an exercise, derived from logged bests vs benchmarks. */
export type AgentWorkoutStrength = {
  /** e.g. "Intermediate". */
  levelLabel: string;
  /** Hex colour for the level label and the score. */
  color: string;
  /** 0–100 strength score. */
  score: number;
};

export type AgentWorkoutExercise = {
  /** Real exercise row id — null when drawn from the starter catalog. */
  exerciseId: string | null;
  name: string;
  /** Block this exercise covers, e.g. "Chest". */
  blockLabel: string;
  /** Muscle subgroups trained — primary first, then any secondaries. */
  muscles: string[];
  stationLabel: string;
  /** Exercise illustration, when one is mapped. */
  imageUrl: string | null;
  sets: number;
  repMin: number;
  repMax: number;
  /** Suggested working weight (kg) off the user's est-1RM; null when unknown. */
  recommendedWeightKg: number | null;
  /**
   * True when this is a real, rateable exercise but there's no logged 1RM yet —
   * the card prompts the user to log one rather than prescribing a weight.
   */
  needs1RM: boolean;
  /** null when there's no benchmark/bodyweight to rate against. */
  strength: AgentWorkoutStrength | null;
};

/** One pillar of the daily life score. */
export type AgentScorePillar = {
  pillar: TaskDomain;
  completed: number;
  total: number;
  /** 0-100, or null when the pillar had nothing scheduled (neutral). */
  score: number | null;
};

/** One day in the score trend. */
export type AgentScoreDay = {
  date: string;
  score: number | null;
};

export type AgentSpendingCategory = {
  category: string;
  total: number;
  count: number;
};

export type AgentSpendingMerchant = {
  merchant: string;
  total: number;
  count: number;
};

export type AgentBirthdayEntry = {
  person: Person;
  /** Next occurrence, YYYY-MM-DD. */
  date: string;
  daysAway: number;
  /** Age they turn, when the birth year is known. */
  turns: number | null;
};

export type AgentFollowupEntry = {
  person: Person;
  /** Days past their cadence; null when they've never been contacted. */
  overdueDays: number | null;
};

export type AgentCard =
  | { type: "task_list"; title: string; tasks: Task[] }
  | { type: "task_created"; task: Task }
  | { type: "task_completed"; task: Task }
  | { type: "person_profile"; title: string; person: Person }
  | { type: "people_list"; title: string; people: Person[] }
  | {
      type: "workout_session";
      title: string;
      focusLabel: string;
      /** Real exercise ids to start a logged session with (may be empty). */
      exerciseIds: string[];
      exercises: AgentWorkoutExercise[];
    }
  | {
      type: "score";
      title: string;
      date: string;
      score: number | null;
      pillars: AgentScorePillar[];
      /** Trailing days ending today, oldest first. */
      trend: AgentScoreDay[];
    }
  | {
      type: "spending";
      title: string;
      monthLabel: string;
      total: number;
      categories: AgentSpendingCategory[];
      merchants: AgentSpendingMerchant[];
    }
  | { type: "birthday_list"; title: string; entries: AgentBirthdayEntry[] }
  | { type: "followup_list"; title: string; entries: AgentFollowupEntry[] };

/** A context-aware suggestion chip for the agent welcome screen. The icon is a
 *  lucide icon name and the tone keys a client-side colour map, so the server
 *  never ships class strings the Tailwind compiler hasn't seen. */
export type AgentSuggestionChip = {
  label: string;
  prompt: string;
  icon: string;
  tone: string;
};

export type AgentChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AgentReply = {
  text: string;
  cards: AgentCard[];
};
