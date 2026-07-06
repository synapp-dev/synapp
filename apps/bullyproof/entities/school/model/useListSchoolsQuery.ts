import type { SchoolReadableRow } from "@/types/db";
import {
  useQuery,
  keepPreviousData,
  type UseQueryResult,
} from "@tanstack/react-query";
import { schoolApi } from "../api/endpoints";
import { schoolKeys } from "./keys";

export type SchoolStatus = "onboarding" | "ready" | "active" | "certification";
export type School = SchoolReadableRow & {
  status?: SchoolStatus;
};

export function useListSchoolsQuery(
  params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sort?: "latest";
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

export function useLatestSchoolQuery(
  options?: { enabled?: boolean }
): UseQueryResult<School | null, Error> {
  return useQuery<School | null, Error>({
    queryKey: schoolKeys.latest(),
    queryFn: async () => {
      const { data, error } = await schoolApi.get.listSchools({
        limit: 1,
        offset: 0,
        sort: "latest",
      });
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    },
    staleTime: 60_000,
    enabled: options?.enabled,
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

export type SchoolStats = {
  daysBullyProof: number;
  startDate: string | null;
  teacherCount: number;
  totalStaff: number;
  classCount: number;
  completedLessonCount: number;
};

export function useSchoolStatsQuery(
  schoolIdOrSlug: string | null | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<SchoolStats | null, Error> {
  return useQuery<SchoolStats | null, Error>({
    queryKey: [...schoolKeys.all(), "stats", schoolIdOrSlug ?? ""],
    queryFn: async () => {
      if (!schoolIdOrSlug) return null;
      const { data, error } = await schoolApi.get.stats(schoolIdOrSlug);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!schoolIdOrSlug,
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

export type KeyStaffMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
};

export type KeyStaffApMember = KeyStaffMember & { positions: string[] };

export type KeyStaffData = {
  admins: KeyStaffMember[];
  apStaff: KeyStaffApMember[];
};

export function useSchoolKeyStaffQuery(
  schoolIdOrSlug: string | null | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<KeyStaffData | null, Error> {
  return useQuery<KeyStaffData | null, Error>({
    queryKey: [...schoolKeys.all(), "keyStaff", schoolIdOrSlug ?? ""],
    queryFn: async () => {
      if (!schoolIdOrSlug) return null;
      const { data, error } = await schoolApi.get.keyStaff(schoolIdOrSlug);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!schoolIdOrSlug,
  });
}
