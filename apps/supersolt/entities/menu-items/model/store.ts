import { create } from "zustand";

type MenuItemsFilterState = {
  search: string;
  sectionName: string;
  page: number;
  pageSize: number;
  setSearch: (value: string) => void;
  setSectionName: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  reset: () => void;
};

const DEFAULT_PAGE_SIZE = 10;

export const useMenuItemsFilterStore = create<MenuItemsFilterState>((set) => ({
  search: "",
  sectionName: "all",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  setSearch: (search) => set({ search, page: 1 }),
  setSectionName: (sectionName) => set({ sectionName, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  reset: () =>
    set({
      search: "",
      sectionName: "all",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
}));
