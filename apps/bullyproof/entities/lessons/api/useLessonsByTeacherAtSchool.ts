import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { type Lesson } from "@/entities/lessons/ui/lesson-card";

export const getLessonsByTeacherAtSchoolOptions = (
  teacherId: string | null | undefined,
  schoolId: string | null | undefined,
  limit = 50
) =>
  queryOptions<Lesson[]>({
    queryKey: ["lessons", "teacherAtSchool", teacherId ?? "", schoolId ?? "", limit],
    queryFn: async () => {
      if (!teacherId || !schoolId) return [];

      const lessonsResult = await lessonsApi.get.list({
        teacherId,
        schoolId,
        limit,
      });
      if (lessonsResult.error) {
        throw new Error(lessonsResult.error.message || "Failed to fetch lessons");
      }

      const lessons = lessonsResult.data ?? [];
      const lessonsWithDetails = await Promise.all(
        lessons.map(async (lesson) => {
          const detailResult = await lessonsApi.get.byId(lesson.id);
          if (detailResult.error || !detailResult.data) return lesson;

          const detail = detailResult.data;
          return {
            ...lesson,
            topic: detail.topic,
            assignedClasses: detail.assignedClasses || [],
            teacher: detail.teacher ?? null,
          };
        })
      );

      return lessonsWithDetails;
    },
    enabled: !!teacherId && !!schoolId,
    staleTime: 60_000,
  });

export function useLessonsByTeacherAtSchool(
  teacherId: string | null | undefined,
  schoolId: string | null | undefined,
  limit = 50
): UseQueryResult<Lesson[], Error> {
  return useQuery(getLessonsByTeacherAtSchoolOptions(teacherId, schoolId, limit));
}
