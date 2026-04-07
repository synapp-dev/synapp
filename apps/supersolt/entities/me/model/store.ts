import { create } from "zustand";

export type MeUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  features: string[];
};

type MeState = {
  currentUser: MeUser | null;
  isLoading: boolean;
  error: string | null;
  setCurrentUser: (user: MeUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
};

export const useMeStore = create<MeState>((set) => ({
  currentUser: null,
  isLoading: false,
  error: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ currentUser: null, isLoading: false, error: null }),
}));
