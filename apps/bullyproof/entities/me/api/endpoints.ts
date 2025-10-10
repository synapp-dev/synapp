// Client bundle should import the client fetcher; server-only code can use the server fetcher if needed
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { vUserProfileExpanded, vSchoolsEnriched } from "@/drizzle/schema";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;
type School = typeof vSchoolsEnriched.$inferSelect;

export const meApi = {
  get: {
    currentUser(): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>("/me");
    },
    userById(id: string): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>(`/users/${encodeURIComponent(id)}`);
    },
    userByEmail(email: string): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>(
        `/users?email=${encodeURIComponent(email)}`
      );
    },
  },
  put: {
    updateProfile(payload: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
      metadata?: Record<string, unknown>;
    }): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>("/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  schools: {
    get: {
      mySchools(params?: {
        limit?: number;
        random?: boolean;
      }): Promise<ApiResult<School[]>> {
        const searchParams = new URLSearchParams();
        if (params?.limit) searchParams.set("limit", params.limit.toString());
        if (params?.random)
          searchParams.set("random", params.random.toString());

        const query = searchParams.toString();
        return apiFetch<School[]>(`/me/schools${query ? `?${query}` : ""}`);
      },
      schoolsForUser(
        userId: string,
        params?: { limit?: number }
      ): Promise<ApiResult<School[]>> {
        const searchParams = new URLSearchParams();
        searchParams.set("userId", userId);
        if (params?.limit) searchParams.set("limit", params.limit.toString());

        return apiFetch<School[]>(`/me/schools?${searchParams.toString()}`);
      },
    },
  },
};
