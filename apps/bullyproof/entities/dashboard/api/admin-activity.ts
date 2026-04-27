import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type AdminActivityFeedItemDto = {
  id: string;
  type:
    | "school_onboarded"
    | "class_completed"
    | "training_completed"
    | "user_registered"
    | "certificate_issued";
  message: string;
  occurredAt: string;
};

export const adminActivityApi = {
  list(): Promise<ApiResult<AdminActivityFeedItemDto[]>> {
    return apiFetch<AdminActivityFeedItemDto[]>(
      "/admin/dashboard/activity"
    );
  },
};
