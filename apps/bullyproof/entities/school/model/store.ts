import { create } from "zustand";
import type { Tables } from "@/types/supabase";

type School = Tables<"schools">;

type SchoolState = {
  schools: School[];
  setSchools: (rows: School[]) => void;
};

export const useSchoolStore = create<SchoolState>((set) => ({
  schools: [],
  setSchools: (rows) => set({ schools: rows }),
}));
