import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";
import type { vUserProfileExpanded } from "@/drizzle/schema";
import { meKeys } from "@/entities/me/model/keys";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

export const getUserByEmailOptions = (email: string) =>
  queryOptions<UserProfile | null>({
    queryKey: meKeys.byEmail(email),
    queryFn: async () => {
      const { data, error } = await meApi.get.userByEmail(email);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export function useUserByEmail(
  email: string
): UseQueryResult<UserProfile | null, Error> {
  return useQuery(getUserByEmailOptions(email)) as UseQueryResult<UserProfile | null, Error>;
}
