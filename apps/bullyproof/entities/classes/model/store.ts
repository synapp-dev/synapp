import type { ClassRow } from "@/types/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { classesApi } from "../api/endpoints";
import { classesKeys } from "./keys";

type Class = ClassRow;

export type ClassWithYearCodes = Class & { yearCodes?: string[] | null; yearNames?: string[] | null };

// React Query hooks for classes
export function useClasses(filters?: {
  schoolId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  active?: boolean;
}) {
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
