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
    stats(schoolIdOrSlug: string): Promise<
      ApiResult<{ daysBullyProof: number; startDate: string | null; teacherCount: number; totalStaff: number; classCount: number; completedLessonCount: number }>
    > {
      return apiFetch(
        `/schools/${encodeURIComponent(schoolIdOrSlug)}/stats`
      );
    },
    keyStaff(schoolIdOrSlug: string): Promise<
      ApiResult<{
        admins: Array<{
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          avatarUrl: string | null;
        }>;
        apStaff: Array<{
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          avatarUrl: string | null;
          positions: string[];
        }>;
      }>
    > {
      return apiFetch(
        `/schools/${encodeURIComponent(schoolIdOrSlug)}/key-staff`
      );
    },
    years(schoolId: string): Promise<
      ApiResult<Array<{ year: { id: string; code: string; displayName: string; levelId: string; sortIndex: number }; level: { id: string; name: string; key: string } }>>
    > {
      return apiFetch(`/schools/${encodeURIComponent(schoolId)}/years`);
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
      name: string;
      stateId: string;
      sectorId: string;
      levelIds?: string[];
      yearIds?: string[];
    }): Promise<ApiResult<School>> {
      return apiFetch<School>("/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    uploadImage(
      schoolId: string,
      type: "avatar" | "banner",
      file: File
    ): Promise<ApiResult<{ path: string; school: School }>> {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("file", file);
      return apiFetch<{ path: string; school: School }>(
        `/schools/${encodeURIComponent(schoolId)}/images`,
        {
          method: "POST",
          body: formData,
        }
      );
    },
  },
  patch: {
    update(
      schoolId: string,
      payload: {
        name?: string;
        stateId?: string;
        sectorId?: string;
        emailDomain?: string | null;
        address?: string | null;
        bannerUrl?: string | null;
        avatarUrl?: string | null;
        levelIds?: string[];
        yearIds?: string[];
      }
    ): Promise<ApiResult<School>> {
      return apiFetch<School>(`/schools/${encodeURIComponent(schoolId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(schoolId: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/schools/${encodeURIComponent(schoolId)}`,
        {
          method: "DELETE",
        }
      );
    },
  },
};
