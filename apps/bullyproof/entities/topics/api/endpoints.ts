import {
  apiFetch,
  getAuthHeaders,
  type ApiResult,
} from "@/lib/api/fetcher.client";
import type { topics } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect;

export const topicsApi = {
  get: {
    list(params?: {
      stageId?: string;
      limit?: number;
      offset?: number;
      search?: string;
    }): Promise<ApiResult<Topic[]>> {
      const searchParams = new URLSearchParams();
      if (params?.stageId) searchParams.set("stageId", params.stageId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      return apiFetch<Topic[]>(`/topics${query ? `?${query}` : ""}`);
    },
    byId(
      id: string
    ): Promise<ApiResult<Topic & { stage?: any; slides?: any[] }>> {
      return apiFetch<Topic & { stage?: any; slides?: any[] }>(
        `/topics/${encodeURIComponent(id)}`
      );
    },
  },
  post: {
    create(payload: {
      stageId: string;
      title: string;
      description?: string;
      officialNotes?: string;
    }): Promise<ApiResult<Topic & { stage?: any; slides?: any[] }>> {
      return apiFetch<Topic & { stage?: any; slides?: any[] }>("/topics", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        title?: string;
        description?: string;
        officialNotes?: string;
      }
    ): Promise<ApiResult<Topic & { stage?: any; slides?: any[] }>> {
      return apiFetch<Topic & { stage?: any; slides?: any[] }>(
        `/topics/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/topics/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
  },
  slides: {
    create(payload: {
      topicId: string;
      orderIndex: number;
      kind?: "text" | "image" | "video";
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/topic-slides", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update(
      slideId: string,
      payload: {
        kind?: "text" | "image" | "video";
        imageUrl?: string | null;
        videoUrl?: string | null;
        textHtml?: string | null;
        videoStartS?: number | null;
        videoEndS?: number | null;
        orderIndex?: number;
      }
    ): Promise<ApiResult<any>> {
      return apiFetch<any>(`/topic-slides/${encodeURIComponent(slideId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    getImageUrl(slideId: string): Promise<ApiResult<{ url: string }>> {
      return apiFetch<{ url: string }>(
        `/topic-slides/${encodeURIComponent(slideId)}/url`
      );
    },
    delete(slideId: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/topic-slides/${encodeURIComponent(slideId)}`,
        {
          method: "DELETE",
        }
      );
    },
    reorder(payload: {
      topicId: string;
      slideIds: string[];
    }): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>("/topic-slides/reorder", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    bulkSave(
      formData: FormData
    ): Promise<ApiResult<{ success: boolean; topic: any }>> {
      // Use fetch directly for FormData (apiFetch sets JSON content-type)
      // But we still need to add the authorization header
      return getAuthHeaders()
        .then((authHeaders) => {
          return fetch(`/api/topic-slides/bulk-save`, {
            method: "POST",
            headers: authHeaders, // Add authorization header
            body: formData,
            // Don't set Content-Type header - browser will set it with boundary for FormData
          });
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
  },
  reorder(payload: {
    stageId: string;
    topicIds: string[];
  }): Promise<ApiResult<{ success: boolean }>> {
    return apiFetch<{ success: boolean }>("/topics/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
