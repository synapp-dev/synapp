import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
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
    byId(id: string): Promise<ApiResult<Topic & { stage?: any; slides?: any[] }>> {
      return apiFetch<Topic & { stage?: any; slides?: any[] }>(`/topics/${encodeURIComponent(id)}`);
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
      return apiFetch<Topic & { stage?: any; slides?: any[] }>(`/topics/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/topics/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
