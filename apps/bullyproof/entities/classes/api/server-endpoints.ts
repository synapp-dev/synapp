// Server-side classes API endpoints
import { apiFetch, type ApiResult } from "@/lib/api/fetcher";
import type { classes } from "@/server/db/schema";

type Class = typeof classes.$inferSelect;
type ClassWithYearCodes = Class & { yearCodes?: string[] | null };

export const classesServerApi = {
  get: {
    list(params?: {
      schoolId?: string;
      limit?: number;
      offset?: number;
      search?: string;
      active?: boolean;
    }): Promise<ApiResult<ClassWithYearCodes[]>> {
      const searchParams = new URLSearchParams();
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);
      if (params?.active !== undefined)
        searchParams.set("active", params.active.toString());

      const query = searchParams.toString();
      return apiFetch<ClassWithYearCodes[]>(`/classes${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Class & { years?: any[] }>> {
      return apiFetch<Class & { years?: any[] }>(
        `/classes/${encodeURIComponent(id)}`
      );
    },
  },
};

