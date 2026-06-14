"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey } from "@/hooks/tasks/use-tasks";
import type { Task } from "@/entities/tasks/model/types";

export type ReminderAction = "done" | "skip" | "delay";

export function useReminderTask(taskId: string | null) {
  return useQuery({
    queryKey: ["reminder-task", taskId],
    queryFn: async (): Promise<Task> => {
      const result = await apiFetch<Task>(`/tasks/${taskId}`);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: taskId !== null,
    staleTime: 0,
  });
}

export function useRespondTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      taskId: string;
      action: ReminderAction;
    }): Promise<Task> => {
      const result = await apiFetch<Task>(`/tasks/${args.taskId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action: args.action }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
