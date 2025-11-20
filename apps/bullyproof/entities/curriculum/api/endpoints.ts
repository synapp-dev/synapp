import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { curriculumStages, schoolYears, schoolLevels } from "@/server/db/schema";

type Stage = typeof curriculumStages.$inferSelect;
type Year = typeof schoolYears.$inferSelect;
type Level = typeof schoolLevels.$inferSelect;

export const curriculumApi = {
  stages: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Stage[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Stage[]>(`/curriculum/stages${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Stage & { years?: any[] }>> {
      return apiFetch<Stage & { years?: any[] }>(`/curriculum/stages/${encodeURIComponent(id)}`);
    },
    byCode(code: string): Promise<ApiResult<Stage & { years?: any[] }>> {
      return apiFetch<Stage & { years?: any[] }>(`/curriculum/stages/by-code/${encodeURIComponent(code)}`);
    },
  },
  years: {
    list(params?: {
      levelId?: string;
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Year[]>> {
      const searchParams = new URLSearchParams();
      if (params?.levelId) searchParams.set("levelId", params.levelId);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Year[]>(`/curriculum/years${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Year & { level?: any; stages?: any[] }>> {
      return apiFetch<Year & { level?: any; stages?: any[] }>(`/curriculum/years/${encodeURIComponent(id)}`);
    },
  },
  levels: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Level[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Level[]>(`/curriculum/levels${query ? `?${query}` : ""}`);
    },
  },
};
