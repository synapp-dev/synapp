import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { schoolLevels } from "@/server/db/schema";

type SchoolLevel = typeof schoolLevels.$inferSelect;

export const schoolLevelsApi = {
  get: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<SchoolLevel[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<SchoolLevel[]>(`/school-levels${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<SchoolLevel>> {
      return apiFetch<SchoolLevel>(`/school-levels/${encodeURIComponent(id)}`);
    },
  },
};
