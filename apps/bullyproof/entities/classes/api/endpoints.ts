import type { ClassRow } from "@/types/db";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

type Class = ClassRow;
type ClassWithYearCodes = Class & { yearCodes?: string[]; yearNames?: string[] };

export const classesApi = {
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
      if (params?.active !== undefined) searchParams.set("active", params.active.toString());

      const query = searchParams.toString();
      return apiFetch<ClassWithYearCodes[]>(`/classes${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Class & { years?: any[]; teachers?: any[] }>> {
      return apiFetch<Class & { years?: any[]; teachers?: any[] }>(`/classes/${encodeURIComponent(id)}`);
    },
  },
  post: {
    create(payload: {
      schoolId: string;
      name: string;
      code?: string;
      stream?: string;
      room?: string;
      studentCap?: number;
      active?: boolean;
      yearIds?: string[];
      startYear?: string;
    }): Promise<ApiResult<Class & { years?: any[] }>> {
      return apiFetch<Class & { years?: any[] }>("/classes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        name?: string;
        code?: string;
        stream?: string;
        room?: string;
        studentCap?: number;
        active?: boolean;
        yearIds?: string[];
        teacherIds?: string[];
        startYear?: string;
      }
    ): Promise<ApiResult<Class & { years?: any[]; teachers?: any[] }>> {
      return apiFetch<Class & { years?: any[]; teachers?: any[] }>(`/classes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    bulkUpdateYearLevels(payload: {
      classIds: string[];
      yearIds?: string[];
      action?: "assign" | "replace";
      startYear?: string;
    }): Promise<ApiResult<{
      success: boolean;
      results: Array<{
        classId: string;
        className: string;
        success: boolean;
        message: string;
      }>;
      summary: {
        total: number;
        succeeded: number;
        failed: number;
      };
    }>> {
      return apiFetch<{
        success: boolean;
        results: Array<{
          classId: string;
          className: string;
          success: boolean;
          message: string;
        }>;
        summary: {
          total: number;
          succeeded: number;
          failed: number;
        };
      }>("/classes/bulk-year-levels", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/classes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    deleteBatch(payload: { classIds: string[] }): Promise<ApiResult<{ success: boolean; deletedCount: number; message: string }>> {
      return apiFetch<{ success: boolean; deletedCount: number; message: string }>("/classes/delete", {
        method: "DELETE",
        body: JSON.stringify(payload),
      });
    },
  },
};
