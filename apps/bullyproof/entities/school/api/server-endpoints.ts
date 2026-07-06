import type { SchoolReadableRow } from "@/types/db";
// Server-side school API endpoints
import { apiFetch, type ApiResult } from "@/lib/api/fetcher";

type School = SchoolReadableRow;

export const schoolServerApi = {
  get: {
    schools(): Promise<ApiResult<School[]>> {
      return apiFetch<School[]>("/schools");
    },
    listSchools(params?: {
      limit?: number;
      offset?: number;
      search?: string;
    }): Promise<ApiResult<School[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      return apiFetch<School[]>(`/schools${query ? `?${query}` : ""}`);
    },
    schoolBySlug(slug: string): Promise<ApiResult<School | null>> {
      return apiFetch<School | null>(`/schools/${slug}`);
    },
  },
  post: {
    inviteSchool(payload: {
      name: string;
      state: string;
      address?: string;
      level: string;
      sector: string;
      email: string;
    }): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>("/schools/invite", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
