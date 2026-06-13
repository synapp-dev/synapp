import { create } from "zustand";

type SuppliersFilterState = {
  search: string;
  category: string;
  status: string;
  archived: boolean;
  hasProducts: string;
  sort: string;
  page: number;
  pageSize: number;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setStatus: (value: string) => void;
  setArchived: (value: boolean) => void;
  setHasProducts: (value: string) => void;
  setSort: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  reset: () => void;
};

const DEFAULT_PAGE_SIZE = 10;

export const useSuppliersFilterStore = create<SuppliersFilterState>((set) => ({
  search: "",
  category: "all",
  status: "all",
  archived: false,
  hasProducts: "all",
  sort: "name",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  setSearch: (search) => set({ search, page: 1 }),
  setCategory: (category) => set({ category, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setArchived: (archived) => set({ archived, page: 1 }),
  setHasProducts: (hasProducts) => set({ hasProducts, page: 1 }),
  setSort: (sort) => set({ sort, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  reset: () =>
    set({
      search: "",
      category: "all",
      status: "all",
      archived: false,
      hasProducts: "all",
      sort: "name",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
}));
