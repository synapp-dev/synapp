import { create } from "zustand";
import type { lessons } from "@/server/db/schema";

type Lesson = typeof lessons.$inferSelect;

type LessonsState = {
  lessons: Lesson[];
  setLessons: (lessons: Lesson[]) => void;
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>) => void;
  removeLesson: (id: string) => void;
  clearLessons: () => void;
};

export const useLessonsStore = create<LessonsState>((set) => ({
  lessons: [],
  setLessons: (lessons) => set({ lessons }),
  addLesson: (lesson) =>
    set((state) => ({
      lessons: [...state.lessons, lesson],
    })),
  updateLesson: (id, lesson) =>
    set((state) => ({
      lessons: state.lessons.map((l) => (l.id === id ? { ...l, ...lesson } : l)),
    })),
  removeLesson: (id) =>
    set((state) => ({
      lessons: state.lessons.filter((l) => l.id !== id),
    })),
  clearLessons: () => set({ lessons: [] }),
}));
