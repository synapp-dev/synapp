import {
  apiFetch,
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
      useView?: boolean;
      includeSlides?: boolean;
      includeUrls?: boolean;
    }): Promise<ApiResult<Topic[]>> {
      const searchParams = new URLSearchParams();
      if (params?.stageId) searchParams.set("stageId", params.stageId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);
      if (params?.useView) searchParams.set("useView", "true");
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic[]>(`/topics${query ? `?${query}` : ""}`);
    },
    byId(
      id: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic & { stage?: any; slides?: any[] }>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic & { stage?: any; slides?: any[] }>(
        `/topics/${encodeURIComponent(id)}${query ? `?${query}` : ""}`
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
        status?: "draft" | "published" | "archived";
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
      return apiFetch<{ success: boolean; topic: any }>(
        "/topic-slides/bulk-save",
        {
          method: "POST",
          body: formData,
        }
      );
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
  lessonPlans: {
    list(topicId: string): Promise<
      ApiResult<
        Array<{
          id: string;
          topicId: string;
          fileName: string;
          fileUrl: string;
          fileSize: number | null;
          uploadedBy: string | null;
          createdAt: string;
        }>
      >
    > {
      return apiFetch(
        `/topic-lesson-plans?topicId=${encodeURIComponent(topicId)}`
      );
    },
    upload(
      topicId: string,
      file: File
    ): Promise<
      ApiResult<{
        id: string;
        topicId: string;
        fileName: string;
        fileUrl: string;
        fileSize: number | null;
        uploadedBy: string | null;
        createdAt: string;
      }>
    > {
      const formData = new FormData();
      formData.append("topicId", topicId);
      formData.append("file", file);
      return apiFetch("/topic-lesson-plans", {
        method: "POST",
        body: formData,
      });
    },
    getUrl(
      planId: string
    ): Promise<ApiResult<{ url: string; fileName: string }>> {
      return apiFetch(
        `/topic-lesson-plans/${encodeURIComponent(planId)}`
      );
    },
    delete(planId: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch(
        `/topic-lesson-plans/${encodeURIComponent(planId)}`,
        { method: "DELETE" }
      );
    },
  },
};
