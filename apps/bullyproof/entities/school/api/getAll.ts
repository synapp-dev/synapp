import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { schools } from "@/drizzle/schema";
import { schoolKeys } from "@/entities/school/model/keys";

type School = typeof schools.$inferSelect;

export const getAllSchoolsOptions = () =>
  queryOptions<School[]>({
    queryKey: schoolKeys.list(),
    queryFn: async () => {
      const { data, error } = await api.get.schools();
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000,
  });

export function useSchools(): UseQueryResult<School[], Error> {
  return useQuery(getAllSchoolsOptions()) as UseQueryResult<School[], Error>;
}
