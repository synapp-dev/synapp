import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  NotificationSettings,
  PushSubscriptionPayload,
  UpdateNotificationSettingsInput,
} from "@/entities/notifications/model/types";

export type PushSendResult = { sent: number; removed: number };

export const notificationsApi = {
  get: {
    settings(): Promise<ApiResult<NotificationSettings>> {
      return apiFetch<NotificationSettings>("/notifications/settings");
    },
  },
  patch: {
    settings(
      input: UpdateNotificationSettingsInput
    ): Promise<ApiResult<NotificationSettings>> {
      return apiFetch<NotificationSettings>("/notifications/settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  },
  push: {
    subscribe(
      payload: PushSubscriptionPayload
    ): Promise<ApiResult<{ subscribed: boolean }>> {
      return apiFetch<{ subscribed: boolean }>("/push/subscribe", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    unsubscribe(endpoint: string): Promise<ApiResult<{ unsubscribed: boolean }>> {
      return apiFetch<{ unsubscribed: boolean }>("/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint }),
      });
    },
    test(): Promise<ApiResult<PushSendResult>> {
      return apiFetch<PushSendResult>("/push/test", { method: "POST" });
    },
  },
};
