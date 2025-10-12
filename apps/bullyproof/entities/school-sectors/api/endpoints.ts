import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { schoolSectors } from "@/server/db/schema";

type SchoolSector = typeof schoolSectors.$inferSelect;

export const schoolSectorsApi = {
  get: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<SchoolSector[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<SchoolSector[]>(`/school-sectors${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<SchoolSector>> {
      return apiFetch<SchoolSector>(`/school-sectors/${encodeURIComponent(id)}`);
    },
  },
};
