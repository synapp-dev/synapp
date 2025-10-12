import { create } from "zustand";
import type { topics } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect;

type TopicsState = {
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
  addTopic: (topic: Topic) => void;
  updateTopic: (id: string, topic: Partial<Topic>) => void;
  removeTopic: (id: string) => void;
  clearTopics: () => void;
};

export const useTopicsStore = create<TopicsState>((set) => ({
  topics: [],
  setTopics: (topics) => set({ topics }),
  addTopic: (topic) =>
    set((state) => ({
      topics: [...state.topics, topic],
    })),
  updateTopic: (id, topic) =>
    set((state) => ({
      topics: state.topics.map((t) => (t.id === id ? { ...t, ...topic } : t)),
    })),
  removeTopic: (id) =>
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== id),
    })),
  clearTopics: () => set({ topics: [] }),
}));
