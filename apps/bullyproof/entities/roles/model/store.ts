import { create } from "zustand";
import type { roles } from "@/server/db/schema";

type Role = typeof roles.$inferSelect;

type RolesState = {
  roles: Role[];
  setRoles: (roles: Role[]) => void;
  addRole: (role: Role) => void;
  updateRole: (id: string, role: Partial<Role>) => void;
  removeRole: (id: string) => void;
  clearRoles: () => void;
};

export const useRolesStore = create<RolesState>((set) => ({
  roles: [],
  setRoles: (roles) => set({ roles }),
  addRole: (role) =>
    set((state) => ({
      roles: [...state.roles, role],
    })),
  updateRole: (id, role) =>
    set((state) => ({
      roles: state.roles.map((r) => (r.id === id ? { ...r, ...role } : r)),
    })),
  removeRole: (id) =>
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== id),
    })),
  clearRoles: () => set({ roles: [] }),
}));
