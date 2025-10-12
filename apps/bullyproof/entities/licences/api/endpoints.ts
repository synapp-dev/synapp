import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { schoolLicences } from "@/server/db/schema";

type Licence = typeof schoolLicences.$inferSelect;

export const licencesApi = {
  get: {
    list(params?: {
      schoolId?: string;
      status?: "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Licence[]>> {
      const searchParams = new URLSearchParams();
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Licence[]>(`/licences${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Licence & { school?: any; createdBy?: any }>> {
      return apiFetch<Licence & { school?: any; createdBy?: any }>(`/licences/${encodeURIComponent(id)}`);
    },
  },
  post: {
    create(payload: {
      schoolId: string;
      status: "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
      startDate: string;
      endDate: string;
      maxUsers?: number;
      features?: Record<string, any>;
      metadata?: Record<string, any>;
    }): Promise<ApiResult<Licence & { school?: any; createdBy?: any }>> {
      return apiFetch<Licence & { school?: any; createdBy?: any }>("/licences", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        status?: "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
        startDate?: string;
        endDate?: string;
        maxUsers?: number;
        features?: Record<string, any>;
        metadata?: Record<string, any>;
      }
    ): Promise<ApiResult<Licence & { school?: any; createdBy?: any }>> {
      return apiFetch<Licence & { school?: any; createdBy?: any }>(`/licences/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/licences/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
