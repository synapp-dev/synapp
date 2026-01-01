import {
  useQuery,
  queryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { lessonsApi } from "./endpoints";
import { lessonsKeys } from "../model/keys";

type LessonWithDetails = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: {
    id: string;
    title: string;
    [key: string]: any;
  };
  teacher?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }>;
};

export const getLessonByIdOptions = (id: string) =>
  queryOptions<LessonWithDetails | null>({
    queryKey: lessonsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await lessonsApi.get.byId(id);
      if (error) {
        console.error(error);
        throw new Error(error.message);
      }
      return data ?? null;
    },
    staleTime: 30 * 1000, // 30 seconds - reduced to make it more reactive to status changes
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
  });

export function useLessonById(
  id: string
): UseQueryResult<LessonWithDetails | null, Error> {
  return useQuery(getLessonByIdOptions(id));
}

