"use client";

import { useEffect, useMemo } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { useMeStore } from "@/entities/me/model/store";
import {
  getLessonStatusInvalidationKeys,
  shouldRefetchLiveLessonStore,
  shouldStopLiveLesson,
} from "@/lib/lesson-lifecycle";

interface LessonStatusRealtimeOptions {
  onStatusChange?: (newStatus: string, oldStatus: string) => void;
}

/**
 * Listen for real-time lesson status changes; invalidate queries and sync live store.
 */
export function useLessonStatusRealtime(
  lessonId?: string,
  options?: LessonStatusRealtimeOptions
) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserClient(), []);
  const currentUser = useMeStore((s) => s.currentUser);
  const fetchInProgressLesson = useLiveLessonStore(
    (s) => s.fetchInProgressLesson
  );
  const onStatusChange = options?.onStatusChange;

  useEffect(() => {
    if (!lessonId) return;

    const channel = supabase
      .channel(`lesson-status:${lessonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lessons",
          filter: `id=eq.${lessonId}`,
        },
        (payload) => {
          const updatedLesson = payload.new as { id: string; status: string };
          const oldLesson = payload.old as { id: string; status: string };

          if (updatedLesson.status === oldLesson.status) {
            return;
          }

          onStatusChange?.(updatedLesson.status, oldLesson.status);

          for (const queryKey of getLessonStatusInvalidationKeys(lessonId)) {
            queryClient.invalidateQueries({
              queryKey,
              refetchType: "active",
            });
          }

          const currentLiveLessonId = useLiveLessonStore.getState().lessonId;

          if (
            shouldStopLiveLesson(
              updatedLesson.status,
              lessonId,
              currentLiveLessonId
            )
          ) {
            useLiveLessonStore.getState().stopLiveLesson();
          }

          if (
            shouldRefetchLiveLessonStore(
              oldLesson.status,
              updatedLesson.status
            )
          ) {
            fetchInProgressLesson(currentUser?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    lessonId,
    queryClient,
    supabase,
    fetchInProgressLesson,
    currentUser?.id,
    onStatusChange,
  ]);
}

/**
 * Listen for status changes on any lesson owned by the current user.
 */
export function useUserLessonsStatusRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserClient(), []);
  const fetchInProgressLesson = useLiveLessonStore(
    (s) => s.fetchInProgressLesson
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-lessons-status:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lessons",
          filter: `created_by_user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedLesson = payload.new as {
            id: string;
            status: string;
          };
          const oldLesson = payload.old as {
            id: string;
            status: string;
          };

          if (updatedLesson.status === oldLesson.status) {
            return;
          }

          for (const queryKey of getLessonStatusInvalidationKeys(
            updatedLesson.id,
            userId
          )) {
            queryClient.invalidateQueries({
              queryKey,
              refetchType: "active",
            });
          }

          const currentLiveLessonId = useLiveLessonStore.getState().lessonId;
          const isCurrentLiveLesson = currentLiveLessonId === updatedLesson.id;

          if (
            shouldStopLiveLesson(
              updatedLesson.status,
              updatedLesson.id,
              isCurrentLiveLesson ? currentLiveLessonId : null
            )
          ) {
            useLiveLessonStore.getState().stopLiveLesson();
          }

          if (
            shouldRefetchLiveLessonStore(
              oldLesson.status,
              updatedLesson.status
            )
          ) {
            fetchInProgressLesson(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, supabase, fetchInProgressLesson]);
}
