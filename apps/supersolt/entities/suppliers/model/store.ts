import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SuppliersViewMode = "table" | "cards";

type SuppliersFilterState = {
  search: string;
  category: string;
  status: string;
  archived: boolean;
  hasProducts: string;
  sort: string;
  page: number;
  pageSize: number;
  viewMode: SuppliersViewMode;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setStatus: (value: string) => void;
  setArchived: (value: boolean) => void;
  setHasProducts: (value: string) => void;
  setSort: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setViewMode: (value: SuppliersViewMode) => void;
  reset: () => void;
};

const DEFAULT_PAGE_SIZE = 50;

export const useSuppliersFilterStore = create<SuppliersFilterState>()(
  persist(
    (set) => ({
      search: "",
      category: "all",
      status: "all",
      archived: false,
      hasProducts: "all",
      sort: "name",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      viewMode: "table",
      setSearch: (search) => set({ search, page: 1 }),
      setCategory: (category) => set({ category, page: 1 }),
      setStatus: (status) => set({ status, page: 1 }),
      setArchived: (archived) => set({ archived, page: 1 }),
      setHasProducts: (hasProducts) => set({ hasProducts, page: 1 }),
      setSort: (sort) => set({ sort, page: 1 }),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setViewMode: (viewMode) => set({ viewMode }),
      // Display preference (viewMode) is intentionally left untouched here — only
      // the actual filters reset.
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
    }),
    {
      name: "supersolt-suppliers-view",
      // Persist only the view-mode preference; filters stay session-only.
      partialize: (state) => ({ viewMode: state.viewMode }),
    },
  ),
);
