import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { MeUser } from "@/entities/me/model/store";

export const meApi = {
  get: {
    currentUser(): Promise<ApiResult<MeUser | null>> {
      return apiFetch<MeUser | null>("/me");
    },
  },
};
