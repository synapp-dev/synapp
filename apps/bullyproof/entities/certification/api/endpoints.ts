import {
  apiFetch,
  type ApiResult,
} from "@/lib/api/fetcher.client";
import type {
  certificationStages,
  certificationTopics,
  certificationSlides,
} from "@/server/db/schema";

type Stage = typeof certificationStages.$inferSelect & {
  topicCount?: number;
};

type Topic = typeof certificationTopics.$inferSelect & {
  slides?: Array<typeof certificationSlides.$inferSelect>;
};

type Slide = typeof certificationSlides.$inferSelect;

export const certificationApi = {
  stages: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Stage[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Stage[]>(
        `/certification/stages${query ? `?${query}` : ""}`
      );
    },
    byId(id: string): Promise<ApiResult<Stage & { topicCount?: number }>> {
      return apiFetch<Stage & { topicCount?: number }>(
        `/certification/stages/${encodeURIComponent(id)}`
      );
    },
    byCode(code: string): Promise<ApiResult<Stage & { topicCount?: number }>> {
      return apiFetch<Stage & { topicCount?: number }>(
        `/certification/stages/by-code/${encodeURIComponent(code)}`
      );
    },
    progress: {
      byCode(code: string): Promise<ApiResult<{ progress: any[] }>> {
        return apiFetch<{ progress: any[] }>(
          `/certification/stages/by-code/${encodeURIComponent(code)}/progress`
        );
      },
    },
    create(data: {
      code: string;
      name: string;
      sortIndex?: number;
    }): Promise<ApiResult<Stage>> {
      return apiFetch<Stage>("/certification/stages", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      id: string,
      data: { name?: string; sortIndex?: number }
    ): Promise<ApiResult<Stage>> {
      return apiFetch<Stage>(`/certification/stages/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/certification/stages/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
  },
  topics: {
    byId(
      id: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic>(
        `/certification/topics/${encodeURIComponent(id)}${query ? `?${query}` : ""}`
      );
    },
    byStageCode(
      code: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic[]>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic[]>(
        `/certification/topics/by-stage-code/${encodeURIComponent(code)}${query ? `?${query}` : ""}`
      );
    },
    create(data: {
      stageId: string;
      title: string;
      officialNotes?: string | null;
      stageOrder?: number | null;
    }): Promise<ApiResult<Topic>> {
      return apiFetch<Topic>("/certification/topics", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      id: string,
      data: {
        title?: string;
        officialNotes?: string | null;
        status?: "draft" | "published" | "archived";
        stageOrder?: number | null;
      }
    ): Promise<ApiResult<Topic>> {
      return apiFetch<Topic>(`/certification/topics/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/certification/topics/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
    reorder(data: {
      stageId: string;
      topicIds: string[];
    }): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>("/certification/topics/reorder", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    slides: {
      list(topicId: string): Promise<ApiResult<Slide[]>> {
        return apiFetch<Slide[]>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides`
        );
      },
      create(
        topicId: string,
        payload: {
          orderIndex: number;
          kind: "image" | "video" | "quiz" | "test";
          imageUrl?: string | null;
          videoUrl?: string | null;
          textHtml?: string | null;
          videoStartS?: number | null;
          videoEndS?: number | null;
          quizData?: any | null;
        }
      ): Promise<ApiResult<Slide>> {
        return apiFetch<Slide>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      update(
        topicId: string,
        slideId: string,
        payload: {
          kind?: "image" | "video" | "quiz" | "test";
          imageUrl?: string | null;
          videoUrl?: string | null;
          textHtml?: string | null;
          videoStartS?: number | null;
          videoEndS?: number | null;
          quizData?: any | null;
          orderIndex?: number;
        }
      ): Promise<ApiResult<Slide>> {
        return apiFetch<Slide>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      },
      delete(
        topicId: string,
        slideId: string
      ): Promise<ApiResult<{ success: boolean }>> {
        return apiFetch<{ success: boolean }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}`,
          {
            method: "DELETE",
          }
        );
      },
      bulkSave(
        topicId: string,
        formData: FormData
      ): Promise<ApiResult<{ success: boolean; topic: Topic }>> {
        return apiFetch<{ success: boolean; topic: Topic }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/bulk`,
          {
            method: "POST",
            body: formData,
          }
        );
      },
      getImageUrl(slideId: string): Promise<ApiResult<{ url: string | null }>> {
        return apiFetch<{ url: string | null }>(
          `/certification-slides/${encodeURIComponent(slideId)}/url`
        );
      },
      markViewed(topicId: string, slideId: string): Promise<ApiResult<{ success: boolean }>> {
        return apiFetch<{ success: boolean }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}/view`,
          {
            method: "POST",
          }
        );
      },
    },
    progress: {
      get(topicId: string): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`
        );
      },
      create(
        topicId: string,
        payload: { currentSlideId?: string }
      ): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      update(
        topicId: string,
        payload: {
          currentSlideId?: string;
          status?: "started" | "in_progress" | "completed" | "passed" | "failed";
          scorePercentage?: number;
        }
      ): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      },
    },
  },
  answers: {
    create(payload: {
      stageId: string;
      topicId: string;
      slideId: string;
      attemptId?: string;
      answerId?: string;
      isCorrect: boolean;
      timeTaken?: number;
    }): Promise<ApiResult<{ answer: any }>> {
      return apiFetch<{ answer: any }>(`/certification/answers`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
