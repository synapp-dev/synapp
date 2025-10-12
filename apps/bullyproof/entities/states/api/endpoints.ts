import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { states } from "@/server/db/schema";

type State = typeof states.$inferSelect;

export const statesApi = {
  get: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<State[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<State[]>(`/states${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<State>> {
      return apiFetch<State>(`/states/${encodeURIComponent(id)}`);
    },
  },
};
