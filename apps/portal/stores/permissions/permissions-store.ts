import { create } from "zustand";

type PermissionStore = {
  actions: string[];
  setActions: (actions: string[]) => void;
};

export const usePermissionStore = create<PermissionStore>((set) => ({
  actions: [],
  setActions: (actions) => set({ actions }),
}));
