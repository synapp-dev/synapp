import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { roles } from "@/server/db/schema";

type Role = typeof roles.$inferSelect;

export const rolesApi = {
  get: {
    list(params?: {
      scope?: "platform" | "school";
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Role[]>> {
      const searchParams = new URLSearchParams();
      if (params?.scope) searchParams.set("scope", params.scope);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Role[]>(`/roles${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Role>> {
      return apiFetch<Role>(`/roles/${encodeURIComponent(id)}`);
    },
    userRoles(userId: string): Promise<ApiResult<any[]>> {
      return apiFetch<any[]>(`/user-roles?userId=${encodeURIComponent(userId)}`);
    },
  },
  post: {
    create(payload: {
      name: string;
      key: string;
      description?: string;
      scope: "platform" | "school";
    }): Promise<ApiResult<Role>> {
      return apiFetch<Role>("/roles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    assignRole(payload: {
      userId: string;
      roleId: string;
      schoolId?: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/user-roles", {
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
        key?: string;
        description?: string;
      }
    ): Promise<ApiResult<Role>> {
      return apiFetch<Role>(`/roles/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/roles/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    removeRole(payload: {
      userId: string;
      roleId: string;
      schoolId?: string;
    }): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>("/user-roles", {
        method: "DELETE",
        body: JSON.stringify(payload),
      });
    },
  },
};
