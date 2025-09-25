import { create } from "zustand";

export type DemoUserRole =
  | "Bullyproof Admin"
  | "Bullyproof Staff"
  | "School Admin"
  | "Teacher"
  | "Roaming Teacher"
  | "Government Official";

interface DemoUserSwitcherState {
  selectedUser: DemoUserRole;
  isOpen: boolean;
  selectedSchoolSlug: string | null;
  setSelectedUser: (role: DemoUserRole) => void;
  setOpen: (open: boolean) => void;
  setSelectedSchoolSlug: (slug: string | null) => void;
}

export const useDemoUserSwitcherStore = create<DemoUserSwitcherState>(
  (set) => ({
    selectedUser: "Bullyproof Admin",
    isOpen: false,
    selectedSchoolSlug: null,
    setSelectedUser: (role) => set({ selectedUser: role }),
    setOpen: (isOpen) => set({ isOpen }),
    setSelectedSchoolSlug: (selectedSchoolSlug) => set({ selectedSchoolSlug }),
  })
);
