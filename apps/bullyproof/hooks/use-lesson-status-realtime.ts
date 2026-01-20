"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { useMeStore } from "@/entities/me/model/store";

/**
 * Hook to listen for real-time changes to lesson status
 * This will invalidate relevant queries and update the live lesson store
 * when a lesson's status changes (e.g., from 'in_progress' to 'pending_review' or 'completed')
 */
export function useLessonStatusRealtime(lessonId?: string) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
  const currentUser = useMeStore((s) => s.currentUser);
  const fetchInProgressLesson = useLiveLessonStore(
    (s) => s.fetchInProgressLesson
  );

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

          // Only react if status actually changed
          if (updatedLesson.status !== oldLesson.status) {
            console.log(
              `Lesson ${lessonId} status changed from ${oldLesson.status} to ${updatedLesson.status}`
            );

            // Invalidate all lesson-related queries and refetch immediately
            // Use pattern matching to catch all lesson queries
            queryClient.invalidateQueries({
              queryKey: ["lessons", "detail", lessonId],
              refetchType: "active", // Immediately refetch active queries
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson", lessonId],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson-details", lessonId],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["live-lessons"],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["in-progress-lessons"],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson-feedback", lessonId],
              refetchType: "active",
            });

            // Check if this is the current live lesson
            const currentLiveLessonId = useLiveLessonStore.getState().lessonId;
            const isCurrentLiveLesson = currentLiveLessonId === lessonId;

            // If the lesson became completed and it's the current live lesson, clear it immediately
            if (updatedLesson.status === "completed" && isCurrentLiveLesson) {
              useLiveLessonStore.getState().stopLiveLesson();
            }

            // Always refetch live lesson when status changes to/from live states OR when it becomes completed
            // This ensures we update the sidebar/dashboard correctly
            const isLiveStatus = ["in_progress", "feedback"].includes(
              updatedLesson.status
            );
            const wasLiveStatus = ["in_progress", "feedback"].includes(
              oldLesson.status
            );
            const becameCompleted = updatedLesson.status === "completed";

            if (isLiveStatus || wasLiveStatus || becameCompleted) {
              // Refetch the live lesson store to get updated list
              // This will clear the live lesson if it became completed (since fetchInProgressLesson only fetches in_progress/feedback)
              fetchInProgressLesson(currentUser?.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId, queryClient, supabase, fetchInProgressLesson, currentUser?.id]);
}

/**
 * Hook to listen for real-time changes to any lessons for the current user
 * This is useful for the dashboard and sidebar to update when any lesson status changes
 */
export function useUserLessonsStatusRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
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
            createdByUserId: string;
          };
          const oldLesson = payload.old as {
            id: string;
            status: string;
            createdByUserId: string;
          };

          // Only react if status actually changed
          if (updatedLesson.status !== oldLesson.status) {
            console.log(
              `User lesson ${updatedLesson.id} status changed from ${oldLesson.status} to ${updatedLesson.status}`
            );

            // Invalidate all lesson-related queries and refetch immediately
            // Use pattern matching to catch all lesson queries
            queryClient.invalidateQueries({
              queryKey: ["lessons", "detail", updatedLesson.id],
              refetchType: "active", // Immediately refetch active queries
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson", updatedLesson.id],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson-details", updatedLesson.id],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["live-lessons", userId],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["in-progress-lessons", userId],
              refetchType: "active",
            });
            queryClient.invalidateQueries({
              queryKey: ["lesson-feedback", updatedLesson.id],
              refetchType: "active",
            });

            // Check if this is the current live lesson
            const currentLiveLessonId = useLiveLessonStore.getState().lessonId;
            const isCurrentLiveLesson =
              currentLiveLessonId === updatedLesson.id;

            // If the lesson became completed and it's the current live lesson, clear it immediately
            if (updatedLesson.status === "completed" && isCurrentLiveLesson) {
              useLiveLessonStore.getState().stopLiveLesson();
            }

            // Always refetch live lesson when status changes to/from live states OR when it becomes completed
            // This ensures we update the sidebar/dashboard correctly
            const isLiveStatus = ["in_progress", "feedback"].includes(
              updatedLesson.status
            );
            const wasLiveStatus = ["in_progress", "feedback"].includes(
              oldLesson.status
            );
            const becameCompleted = updatedLesson.status === "completed";

            if (isLiveStatus || wasLiveStatus || becameCompleted) {
              // Refetch the live lesson store to get updated list
              // This will clear the live lesson if it became completed (since fetchInProgressLesson only fetches in_progress/feedback)
              fetchInProgressLesson(userId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, supabase, fetchInProgressLesson]);
}
