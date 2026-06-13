import type { Task } from "@/entities/tasks/model/types";
import type { Person } from "@/entities/people/model/types";

export type AgentCard =
  | { type: "task_list"; title: string; tasks: Task[] }
  | { type: "task_created"; task: Task }
  | { type: "task_completed"; task: Task }
  | { type: "person_profile"; title: string; person: Person }
  | { type: "people_list"; title: string; people: Person[] };

export type AgentChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AgentReply = {
  text: string;
  cards: AgentCard[];
};
