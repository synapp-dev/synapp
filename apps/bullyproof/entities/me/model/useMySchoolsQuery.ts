import type { SchoolEnrichedRow } from "@/types/db";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { meApi } from "../api/endpoints";
import { meKeys } from "./keys";

export type School = SchoolEnrichedRow;

export function useMySchoolsQuery(
  params?: {
    limit?: number;
    random?: boolean;
  },
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<School[], Error> {
  return useQuery<School[], Error>({
    queryKey: meKeys.schools.mySchools(params),
    queryFn: async () => {
      const { data, error } = await meApi.schools.get.mySchools(params);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, // 30 seconds
    enabled: options?.enabled,
  });
}

export function useSchoolsForUserQuery(
  userId: string,
  params?: { limit?: number }
): UseQueryResult<School[], Error> {
  return useQuery<School[], Error>({
    queryKey: meKeys.schools.forUser(userId, params),
    queryFn: async () => {
      const { data, error } = await meApi.schools.get.schoolsForUser(
        userId,
        params
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, // 30 seconds
    enabled: !!userId, // Only run if userId is provided
  });
}
