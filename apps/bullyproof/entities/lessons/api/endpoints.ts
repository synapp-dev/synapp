import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { lessons } from "@/server/db/schema";

type Lesson = typeof lessons.$inferSelect;

export const lessonsApi = {
  get: {
    list(params?: {
      teacherId?: string;
      classId?: string;
      topicId?: string;
      limit?: number;
      offset?: number;
      search?: string;
    }): Promise<ApiResult<Lesson[]>> {
      const searchParams = new URLSearchParams();
      if (params?.teacherId) searchParams.set("teacherId", params.teacherId);
      if (params?.classId) searchParams.set("classId", params.classId);
      if (params?.topicId) searchParams.set("topicId", params.topicId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      return apiFetch<Lesson[]>(`/lessons${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>(`/lessons/${encodeURIComponent(id)}`);
    },
  },
  post: {
    create(payload: {
      topicId: string;
      title?: string;
      description?: string;
      scheduledFor?: string;
      classIds?: string[];
    }): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>("/lessons", {
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
        scheduledFor?: string;
        classIds?: string[];
      }
    ): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>(`/lessons/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/lessons/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
