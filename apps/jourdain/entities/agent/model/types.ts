import type { Task } from "@/entities/tasks/model/types";
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
    };

export type AgentChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AgentReply = {
  text: string;
  cards: AgentCard[];
};
