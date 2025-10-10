import {
  useQuery,
  keepPreviousData,
  type UseQueryResult,
} from "@tanstack/react-query";
import { schoolApi } from "../api/endpoints";
import { schoolKeys } from "./keys";
import type { vSchoolsReadable } from "@/drizzle/schema";

export type School = typeof vSchoolsReadable.$inferSelect;

export function useListSchoolsQuery(
  params?: {
    limit?: number;
    offset?: number;
    search?: string;
  },
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<School[], Error> {
  return useQuery<School[], Error>({
    queryKey: schoolKeys.listSchools(params),
    queryFn: async () => {
      const { data, error } = await schoolApi.get.listSchools(params);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, // 30 seconds
    enabled: options?.enabled,
    // Keep previous results during background refetch to avoid UI flicker (TanStack v5)
    placeholderData: keepPreviousData,
  });
}

export function useSearchSchoolsQuery(
  params: { query: string; limit?: number },
  options?: { enabled?: boolean }
): UseQueryResult<School[], Error> {
  return useQuery<School[], Error>({
    queryKey: schoolKeys.searchSchools(params),
    queryFn: async () => {
      const { data, error } = await schoolApi.get.listSchools({
        limit: params.limit ?? 5,
        search: params.query,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 10_000,
    enabled: (options?.enabled ?? true) && params.query.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useSchoolBySlugQuery(
  slug: string | null | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<School | null, Error> {
  return useQuery<School | null, Error>({
    queryKey: schoolKeys.detail(slug ?? ""),
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await schoolApi.get.schoolBySlug(slug);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && !!slug,
  });
}
