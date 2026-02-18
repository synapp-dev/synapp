import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import { userKeys } from "@/entities/users/model/keys";

export type UserClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolSlug: string | null;
  schoolName: string | null;
  active: boolean;
  createdAt: string;
};

export type UserSchoolPosition = {
  id: string;
  userId: string;
  schoolId: string;
  position: string;
};

export const getUsersBySchoolOptions = (
  schoolId: string | null | undefined,
  limit = 100
) =>
  queryOptions<UserWithRolesAndSchools[]>({
    queryKey: [...userKeys.lists(), "bySchool", schoolId ?? "", limit],
    queryFn: async () => {
      if (!schoolId) return [];
      const result = await meApi.get.listAllUsers({
        schoolId,
        limit,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch users");
      }
      return result.data?.users ?? [];
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export function useUsersBySchool(
  schoolId: string | null | undefined,
  limit = 100
): UseQueryResult<UserWithRolesAndSchools[], Error> {
  return useQuery(getUsersBySchoolOptions(schoolId, limit));
}

export const getUserPositionsOptions = (userId: string | null | undefined) =>
  queryOptions<UserSchoolPosition[]>({
    queryKey: [...userKeys.detail(userId ?? ""), "positions"],
    queryFn: async () => {
      if (!userId) return [];
      const result = await apiFetch<UserSchoolPosition[]>(
        `/users/${encodeURIComponent(userId)}/positions`
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch user positions");
      }
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

export function useUserPositions(
  userId: string | null | undefined
): UseQueryResult<UserSchoolPosition[], Error> {
  return useQuery(getUserPositionsOptions(userId));
}

export const getUserClassesOptions = (
  userId: string | null | undefined,
  schoolId: string | null | undefined
) =>
  queryOptions<UserClass[]>({
    queryKey: [...userKeys.detail(userId ?? ""), "classes", schoolId ?? ""],
    queryFn: async () => {
      if (!userId || !schoolId) return [];
      const result = await apiFetch<UserClass[]>(
        `/users/${encodeURIComponent(userId)}/classes?schoolId=${encodeURIComponent(schoolId)}`
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch user classes");
      }
      return result.data ?? [];
    },
    enabled: !!userId && !!schoolId,
    staleTime: 60_000,
  });

export function useUserClasses(
  userId: string | null | undefined,
  schoolId: string | null | undefined
): UseQueryResult<UserClass[], Error> {
  return useQuery(getUserClassesOptions(userId, schoolId));
}
