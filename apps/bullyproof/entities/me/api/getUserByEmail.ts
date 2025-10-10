import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { meApi } from "@/entities/me/api/endpoints";
import type { vUserProfileExpanded } from "@/drizzle/schema";
import { meKeys } from "@/entities/me/model/keys";
import { useMeStore } from "@/entities/me/model/store";

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
  const setUser = useMeStore((s) => s.setUser);
  const query = useQuery(getUserByEmailOptions(email));

  useEffect(() => {
    if (query.data) {
      setUser(query.data.id ?? "", query.data);
    }
  }, [query.data, setUser]);

  return query as UseQueryResult<UserProfile | null, Error>;
}
