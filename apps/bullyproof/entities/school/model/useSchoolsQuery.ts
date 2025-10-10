import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { vSchoolsReadable } from "@/drizzle/schema";

type SchoolReadable = typeof vSchoolsReadable.$inferSelect;

export function useSchoolsQuery(): UseQueryResult<SchoolReadable[], Error> {
  return useQuery<SchoolReadable[], Error>({
    queryKey: ["schools", "readable"],
    queryFn: async () => {
      const { data, error } = await api.get.schools();
      if (error) throw new Error(error.message);
      return (data ?? []) as SchoolReadable[];
    },
    staleTime: 30_000,
  });
}
