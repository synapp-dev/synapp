"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    onMutate: async ({ taskId, action }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });
      const previous = queryClient.getQueryData<Task[]>(tasksQueryKey);
      if (action === "done" || action === "skip") {
        queryClient.setQueryData<Task[]>(tasksQueryKey, (old) =>
          (old ?? []).map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: action === "done" ? "done" : "skipped",
                  completedAt:
                    action === "done" ? new Date().toISOString() : null,
                }
              : task
          )
        );
      }
      return { previous };
    },
    onError: (err, _args, context) => {
      if (context?.previous)
        queryClient.setQueryData(tasksQueryKey, context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
