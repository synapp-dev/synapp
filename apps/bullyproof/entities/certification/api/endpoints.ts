import {
  apiFetch,
  getAuthHeaders,
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
  },
  topics: {
    byId(id: string): Promise<ApiResult<Topic>> {
      // First get the topic, then get its slides
      return apiFetch<Topic>(`/certification/topics/${encodeURIComponent(id)}`);
    },
    byStageCode(code: string): Promise<ApiResult<Topic[]>> {
      return apiFetch<Topic[]>(
        `/certification/topics/by-stage-code/${encodeURIComponent(code)}`
      );
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
        // Use fetch directly for FormData
        return getAuthHeaders()
          .then((authHeaders) => {
            return fetch(
              `/api/certification/topics/${encodeURIComponent(topicId)}/slides/bulk`,
              {
                method: "POST",
                headers: authHeaders,
                body: formData,
              }
            );
          })
          .then(async (res) => {
            const body = await res.json();
            if (!res.ok || body?.error) {
              return {
                data: null,
                error: body?.error ?? {
                  message: `HTTP ${res.status}`,
                  status: res.status,
                },
              };
            }
            return { data: body, error: null };
          })
          .catch((err) => ({
            data: null,
            error: {
              message: err.message ?? "Network error",
            },
          }));
      },
      getImageUrl(slideId: string): Promise<ApiResult<{ url: string | null }>> {
        return apiFetch<{ url: string | null }>(
          `/certification-slides/${encodeURIComponent(slideId)}/url`
        );
      },
    },
  },
};
