import { create } from "zustand";
import type { classes } from "@/server/db/schema";

type Class = typeof classes.$inferSelect;

type ClassesState = {
  classes: Class[];
  setClasses: (classes: Class[]) => void;
  addClass: (classData: Class) => void;
  updateClass: (id: string, classData: Partial<Class>) => void;
  removeClass: (id: string) => void;
  clearClasses: () => void;
};

export const useClassesStore = create<ClassesState>((set) => ({
  classes: [],
  setClasses: (classes) => set({ classes }),
  addClass: (classData) =>
    set((state) => ({
      classes: [...state.classes, classData],
    })),
  updateClass: (id, classData) =>
    set((state) => ({
      classes: state.classes.map((c) => (c.id === id ? { ...c, ...classData } : c)),
    })),
  removeClass: (id) =>
    set((state) => ({
      classes: state.classes.filter((c) => c.id !== id),
    })),
  clearClasses: () => set({ classes: [] }),
}));
