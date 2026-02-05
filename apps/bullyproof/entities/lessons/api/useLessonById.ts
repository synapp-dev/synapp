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
    yearLevelDisplay: string | null;
  }>;
};

// Simple UUID validation - checks if the string looks like a valid UUID
const isValidUUID = (id: string | undefined | null): boolean => {
  if (!id || id === "undefined" || id === "null") return false;
  // UUID format: 8-4-4-4-12 hex characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
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
    enabled: isValidUUID(id), // Only fetch if ID is a valid UUID
  });

export function useLessonById(
  id: string
): UseQueryResult<LessonWithDetails | null, Error> {
  return useQuery(getLessonByIdOptions(id));
}

