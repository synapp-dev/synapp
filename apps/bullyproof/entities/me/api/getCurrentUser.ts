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

export const getCurrentUserOptions = () =>
  queryOptions<UserProfile | null>({
    queryKey: meKeys.current(),
    queryFn: async () => {
      const { data, error } = await meApi.get.currentUser();
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export function useCurrentUser(): UseQueryResult<UserProfile | null, Error> {
  const setCurrentUser = useMeStore((s) => s.setCurrentUser);
  const query = useQuery(getCurrentUserOptions());

  useEffect(() => {
    if (query.data) {
      setCurrentUser(query.data);
    }
  }, [query.data, setCurrentUser]);

  return query as UseQueryResult<UserProfile | null, Error>;
}
