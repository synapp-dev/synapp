import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { classesApi } from "../api/endpoints";
import { classesKeys } from "./keys";
import type { classes } from "@/server/db/schema";

type Class = typeof classes.$inferSelect;

export type ClassWithYearCodes = Class & { yearCodes?: string[] | null };

interface ClassesState {
  // Normalized cache: classId -> ClassWithYearCodes
  classes: Record<string, ClassWithYearCodes>;
  // List of class IDs (for maintaining order)
  classIds: string[];
  // Actions
  setClasses: (classes: ClassWithYearCodes[]) => void;
  setClass: (classData: ClassWithYearCodes) => void;
  updateClass: (id: string, classData: Partial<ClassWithYearCodes>) => void;
  removeClass: (id: string) => void;
  clearClasses: () => void;
}

export const useClassesStore = create<ClassesState>((set) => ({
  classes: {},
  classIds: [],

  setClasses: (classes) =>
    set({
      classes: classes.reduce(
        (acc, classData) => {
          acc[classData.id] = classData;
          return acc;
        },
        {} as Record<string, ClassWithYearCodes>
      ),
      classIds: classes.map((c) => c.id),
    }),

  setClass: (classData) =>
    set((state) => {
      const newClasses = { ...state.classes, [classData.id]: classData };
      const newClassIds = state.classIds.includes(classData.id)
        ? state.classIds
        : [...state.classIds, classData.id];
      return { classes: newClasses, classIds: newClassIds };
    }),

  updateClass: (id, classData) =>
    set((state) => {
      if (!state.classes[id]) return state;
      return {
        classes: {
          ...state.classes,
          [id]: { ...state.classes[id], ...classData },
        },
      };
    }),

  removeClass: (id) =>
    set((state) => {
      const { [id]: removed, ...classes } = state.classes;
      return {
        classes,
        classIds: state.classIds.filter((classId) => classId !== id),
      };
    }),

  clearClasses: () => set({ classes: {}, classIds: [] }),
}));

// React Query hooks for classes
export function useClasses(filters?: {
  schoolId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  active?: boolean;
}) {
  const queryClient = useQueryClient();
  const { classes, setClasses } = useClassesStore();

  // Normalize filters for consistent query keys
  const normalizedFilters = filters
    ? (() => {
        const filtered = Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== ""
          )
        );
        return Object.keys(filtered).length > 0 ? filtered : undefined;
      })()
    : undefined;

  // Fetch classes list
  const listQuery = useQuery({
    queryKey: classesKeys.listClasses(normalizedFilters),
    queryFn: async () => {
      const result = await classesApi.get.list(normalizedFilters);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch classes");
      }
      return result.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const classesList: ClassWithYearCodes[] = useMemo(() => {
    return listQuery.data || [];
  }, [listQuery.data]);

  // Track previous classesList to prevent unnecessary updates
  const prevClassesRef = useRef<ClassWithYearCodes[]>([]);

  // Update Zustand store when data changes (only if actually changed)
  useEffect(() => {
    const hasChanged =
      prevClassesRef.current.length !== classesList.length ||
      classesList.some((classData, index) => {
        const prev = prevClassesRef.current[index];
        return !prev || prev.id !== classData.id;
      });

    if (hasChanged && classesList.length > 0) {
      prevClassesRef.current = classesList;
      setClasses(classesList);
    }
  }, [classesList, setClasses]);

  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  return {
    classes: classesList,
    isLoading,
    isError,
    error,
    refetch: listQuery.refetch,
  };
}
