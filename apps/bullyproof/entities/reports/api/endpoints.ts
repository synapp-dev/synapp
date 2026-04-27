import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type AdminReportsOverviewDto = {
  scope: "platform" | "school";
  schoolId: string | null;
  schoolsTotal: number;
  schoolsWithActiveLicence: number;
  lessonsTotal: number;
  lessonRatingsTotal: number;
  certificationsCompletedTotal: number;
  idleActiveSchoolsCount: number | null;
  idleSchools: Array<{
    id: string;
    name: string;
    slug: string | null;
    activationStatus: "locked" | "certification" | "active";
    daysSinceActiveLicenceStart: number | null;
    classCount: number;
    teacherCount: number;
  }>;
  recentLessons: Array<{
    lessonId: string;
    topicTitle: string;
    classNames: string | null;
    teacherFirstName: string | null;
    teacherLastName: string | null;
    schoolId: string;
    schoolName: string;
    schoolSlug: string | null;
    scheduledFor: string | null;
    createdAt: string;
    status: string;
  }>;
};

export const reportsApi = {
  get: {
    overview(schoolId?: string | null): Promise<ApiResult<AdminReportsOverviewDto>> {
      const q =
        schoolId && schoolId.length > 0
          ? `?schoolId=${encodeURIComponent(schoolId)}`
          : "";
      return apiFetch<AdminReportsOverviewDto>(`/admin/reports/overview${q}`);
    },
  },
};
