import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { meApi } from "./endpoints";
import type { vUserProfileExpanded } from "@/drizzle/schema";
import { meKeys } from "../model/keys";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

export const getUserByIdOptions = (id: string) =>
  queryOptions<UserProfile | null>({
    queryKey: meKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await meApi.get.userById(id);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export function useUserById(
  id: string
): UseQueryResult<UserProfile | null, Error> {
  return useQuery(getUserByIdOptions(id)) as UseQueryResult<UserProfile | null, Error>;
}
