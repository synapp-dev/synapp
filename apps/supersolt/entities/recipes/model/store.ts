import { create } from "zustand";

type RecipesFilterState = {
  search: string;
  category: string;
  status: string;
  page: number;
  pageSize: number;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setStatus: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  reset: () => void;
};

const DEFAULT_PAGE_SIZE = 10;

export const useRecipesFilterStore = create<RecipesFilterState>((set) => ({
  search: "",
  category: "all",
  status: "all",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  setSearch: (search) => set({ search, page: 1 }),
  setCategory: (category) => set({ category, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  reset: () =>
    set({
      search: "",
      category: "all",
      status: "all",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
}));
