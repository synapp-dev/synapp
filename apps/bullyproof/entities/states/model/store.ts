import { create } from "zustand";
import type { states } from "@/server/db/schema";

type State = typeof states.$inferSelect;

type StatesState = {
  states: State[];
  setStates: (states: State[]) => void;
  clearStates: () => void;
};

export const useStatesStore = create<StatesState>((set) => ({
  states: [],
  setStates: (states) => set({ states }),
  clearStates: () => set({ states: [] }),
}));
