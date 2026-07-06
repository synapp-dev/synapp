import type { StateRow } from "@/types/db";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

type State = StateRow;

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
