import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { schoolInvites } from "@/server/db/schema";

type Invite = typeof schoolInvites.$inferSelect;

export const invitesApi = {
  get: {
    list(params?: {
      schoolId?: string;
      email?: string;
      status?: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Invite[]>> {
      const searchParams = new URLSearchParams();
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);
      if (params?.email) searchParams.set("email", params.email);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Invite[]>(`/invites${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Invite & { school?: any }>> {
      return apiFetch<Invite & { school?: any }>(`/invites/${encodeURIComponent(id)}`);
    },
  },
  post: {
    create(payload: {
      schoolId: string;
      email: string;
      roleKey: string;
      expiresAt?: string;
      metadata?: Record<string, any>;
    }): Promise<ApiResult<Invite & { school?: any }>> {
      return apiFetch<Invite & { school?: any }>("/invites", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    accept(payload: {
      id: string;
      userId: string;
    }): Promise<ApiResult<Invite & { school?: any }>> {
      return apiFetch<Invite & { school?: any }>("/invites/accept", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        status?: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
        expiresAt?: string;
        metadata?: Record<string, any>;
      }
    ): Promise<ApiResult<Invite & { school?: any }>> {
      return apiFetch<Invite & { school?: any }>(`/invites/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/invites/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
