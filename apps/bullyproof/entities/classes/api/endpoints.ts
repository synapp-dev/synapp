import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { classes } from "@/server/db/schema";

type Class = typeof classes.$inferSelect;

export const classesApi = {
  get: {
    list(params?: {
      schoolId?: string;
      limit?: number;
      offset?: number;
      search?: string;
      active?: boolean;
    }): Promise<ApiResult<Class[]>> {
      const searchParams = new URLSearchParams();
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);
      if (params?.active !== undefined) searchParams.set("active", params.active.toString());

      const query = searchParams.toString();
      return apiFetch<Class[]>(`/classes${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Class & { years?: any[] }>> {
      return apiFetch<Class & { years?: any[] }>(`/classes/${encodeURIComponent(id)}`);
    },
  },
  post: {
    create(payload: {
      schoolId: string;
      name: string;
      code?: string;
      stream?: string;
      room?: string;
      studentCap?: number;
      active?: boolean;
      yearIds?: string[];
    }): Promise<ApiResult<Class & { years?: any[] }>> {
      return apiFetch<Class & { years?: any[] }>("/classes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        name?: string;
        code?: string;
        stream?: string;
        room?: string;
        studentCap?: number;
        active?: boolean;
        yearIds?: string[];
      }
    ): Promise<ApiResult<Class & { years?: any[] }>> {
      return apiFetch<Class & { years?: any[] }>(`/classes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/classes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
