"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey } from "@/hooks/tasks/use-tasks";
import type {
  CheckinRespondInput,
  CheckinReview,
} from "@/entities/checkin/model/types";
import type { Task } from "@/entities/tasks/model/types";

export const checkinQueryKey = ["checkin"] as const;

export function useCheckin(enabled = true) {
  return useQuery({
    queryKey: checkinQueryKey,
    queryFn: async (): Promise<CheckinReview> => {
      const result = await apiFetch<CheckinReview>("/checkin");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled,
  });
}

function withoutItem(review: CheckinReview, taskId: string): CheckinReview {
  return {
    ...review,
    groups: review.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.taskId !== taskId),
      }))
      .filter((group) => group.items.length > 0),
  };
}

export function useCheckinRespond() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckinRespondInput): Promise<Task> => {
      const result = await apiFetch<Task>("/checkin/respond", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: checkinQueryKey });
      const previous = queryClient.getQueryData<CheckinReview>(checkinQueryKey);
      queryClient.setQueryData<CheckinReview>(checkinQueryKey, (old) =>
        old ? withoutItem(old, taskId) : old
      );
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(checkinQueryKey, context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't record answer");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checkinQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useCheckinComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ lastCheckinAt: string }> => {
      const result = await apiFetch<{ lastCheckinAt: string }>(
        "/checkin/complete",
        { method: "POST" }
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: ({ lastCheckinAt }) => {
      queryClient.setQueryData<CheckinReview>(checkinQueryKey, (old) =>
        old ? { ...old, lastCheckinAt } : old
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Couldn't complete check-in"
      );
    },
  });
}
