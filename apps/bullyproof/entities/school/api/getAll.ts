import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api/client";
import type { Tables } from "@/types/supabase";
import { schoolKeys } from "@/entities/school/model/keys";
import { useSchoolStore } from "@/entities/school/model/store";

type School = Tables<"schools">;

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
  const setSchools = useSchoolStore((s: any) => s.setSchools);
  const query = useQuery(getAllSchoolsOptions());
  useEffect(() => {
    if (query.data) setSchools(query.data);
  }, [query.data, setSchools]);
  return query as UseQueryResult<School[], Error>;
}
