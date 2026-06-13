"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/entities/notifications/api/endpoints";
import type {
  NotificationSettings,
  PushCapability,
  UpdateNotificationSettingsInput,
} from "@/entities/notifications/model/types";
import {
  getPushCapability,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

export const notificationSettingsQueryKey = ["notification-settings"] as const;

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingsQueryKey,
    queryFn: async (): Promise<NotificationSettings> => {
      const result = await notificationsApi.get.settings();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: UpdateNotificationSettingsInput
    ): Promise<NotificationSettings> => {
      const result = await notificationsApi.patch.settings(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(notificationSettingsQueryKey, data);
    },
  });
}

/**
 * Manages this device's push subscription: capability detection plus
 * subscribe / unsubscribe / send-test actions. Client-only.
 */
export function usePushSubscription() {
  const [capability, setCapability] = useState<PushCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCapability(await getPushCapability());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await subscribeToPush();
      const result = await notificationsApi.push.subscribe(payload);
      if (result.error) throw new Error(result.error.message);
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable push.");
      await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await notificationsApi.push.unsubscribe(endpoint);
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable push.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const sendTest = useCallback(async () => {
    setError(null);
    const result = await notificationsApi.push.test();
    if (result.error) {
      setError(result.error.message);
      return null;
    }
    if (result.data.sent === 0) {
      setError("No subscribed devices — enable push on this device first.");
    }
    return result.data;
  }, []);

  return { capability, busy, error, subscribe, unsubscribe, sendTest, refresh };
}
