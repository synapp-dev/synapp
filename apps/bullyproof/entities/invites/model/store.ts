import { create } from "zustand";
import type { schoolInvites } from "@/server/db/schema";

type Invite = typeof schoolInvites.$inferSelect;

type InvitesState = {
  invites: Invite[];
  setInvites: (invites: Invite[]) => void;
  addInvite: (invite: Invite) => void;
  updateInvite: (id: string, invite: Partial<Invite>) => void;
  removeInvite: (id: string) => void;
  clearInvites: () => void;
};

export const useInvitesStore = create<InvitesState>((set) => ({
  invites: [],
  setInvites: (invites) => set({ invites }),
  addInvite: (invite) =>
    set((state) => ({
      invites: [...state.invites, invite],
    })),
  updateInvite: (id, invite) =>
    set((state) => ({
      invites: state.invites.map((i) => (i.id === id ? { ...i, ...invite } : i)),
    })),
  removeInvite: (id) =>
    set((state) => ({
      invites: state.invites.filter((i) => i.id !== id),
    })),
  clearInvites: () => set({ invites: [] }),
}));
