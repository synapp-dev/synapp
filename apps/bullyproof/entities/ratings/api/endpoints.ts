import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type RatingsStageSummary = {
  stageId: string;
  stageSlug: string;
  stageCode: string;
  stageName: string;
  stageSortIndex: number;
  ratingCount: number;
  averageRating: number | null;
  latestRatingAt: string | null;
};

export type StageLessonRatingRow = {
  feedbackId: string;
  lessonId: string;
  lessonStatus: string;
  lessonCreatedAt: string;
  lessonMetadata: unknown;
  rating: number;
  comments: string | null;
  feedbackCreatedAt: string;
  stageId: string;
  stageSlug: string;
  stageCode: string;
  stageName: string;
  topicId: string;
  topicTitle: string;
  topicStageOrder: number | null;
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  teacherUserId: string;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  teacherEmail: string | null;
  classNames: string[];
};

export type StageRatingsResponse = {
  stage: {
    id: string;
    slug: string;
    code: string;
    name: string;
    sortIndex: number;
  };
  rows: StageLessonRatingRow[];
};

export const ratingsApi = {
  get: {
    stageSummaries(): Promise<ApiResult<RatingsStageSummary[]>> {
      return apiFetch<RatingsStageSummary[]>("/admin/ratings/stages");
    },
    stageRatings(stageSlug: string): Promise<ApiResult<StageRatingsResponse>> {
      const params = new URLSearchParams({ stageSlug });
      return apiFetch<StageRatingsResponse>(`/admin/ratings?${params.toString()}`);
    },
  },
};
