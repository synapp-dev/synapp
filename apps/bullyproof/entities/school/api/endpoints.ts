import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { vSchoolsReadable } from "@/drizzle/schema";

type School = typeof vSchoolsReadable.$inferSelect;

export const schoolApi = {
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
      return apiFetch<School | null>(`/schools/${encodeURIComponent(slug)}`);
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
    create(payload: {
      school: {
        name: string;
        stateId: string;
        sectorId: string;
        levelIds: string[];
        emailDomain?: string | null;
        address?: string | null;
        bannerUrl?: string | null;
        avatarUrl?: string | null;
      };
      adminEmails: string[];
    }): Promise<ApiResult<{
      school: School;
      adminUsers: Array<{ userId: string; email: string }>;
      errors?: Array<{ email: string; error: string }>;
    }>> {
      return apiFetch<{
        school: School;
        adminUsers: Array<{ userId: string; email: string }>;
        errors?: Array<{ email: string; error: string }>;
      }>("/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
