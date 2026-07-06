import type { SchoolReadableRow } from "@/types/db";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { SchoolRefInput, SchoolSlug } from "@/types/school";

type School = SchoolReadableRow;
export type SchoolCertificationStatusRow = {
  userId: string;
  userName: string;
  userEmail: string;
  roles: Array<{
    roleKey: string;
    roleName: string;
    isPlatform: boolean;
  }>;
  status: "not_started" | "in_progress" | "completed";
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
  completedAt: string | null;
  isCompleted: boolean;
  isApTeacher: boolean;
};

export type SchoolCertificationStatusResponse = {
  course: {
    id: string;
    code: string;
    name: string;
  };
  rows: SchoolCertificationStatusRow[];
};

export const schoolApi = {
  get: {
    schools(): Promise<ApiResult<School[]>> {
      return apiFetch<School[]>("/schools");
    },
    listSchools(params?: {
      limit?: number;
      offset?: number;
      search?: string;
      sort?: "latest";
    }): Promise<ApiResult<School[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);
      if (params?.sort) searchParams.set("sort", params.sort);

      const query = searchParams.toString();
      return apiFetch<School[]>(`/schools${query ? `?${query}` : ""}`);
    },
    /** Fetch school by URL slug (not UUID). */
    schoolBySlug(slug: SchoolSlug): Promise<ApiResult<School | null>> {
      return apiFetch<School | null>(`/schools/${encodeURIComponent(slug)}`);
    },
    /** Accepts SchoolSlug or SchoolId — server resolves via `resolveSchoolRef`. */
    stats(schoolIdOrSlug: SchoolRefInput): Promise<
      ApiResult<{ daysBullyProof: number; startDate: string | null; teacherCount: number; totalStaff: number; classCount: number; completedLessonCount: number }>
    > {
      return apiFetch(
        `/schools/${encodeURIComponent(schoolIdOrSlug)}/stats`
      );
    },
    keyStaff(schoolIdOrSlug: SchoolRefInput): Promise<
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
    certificationStatus(
      schoolId: string
    ): Promise<ApiResult<SchoolCertificationStatusResponse>> {
      return apiFetch(
        `/schools/${encodeURIComponent(schoolId)}/certification`
      );
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
