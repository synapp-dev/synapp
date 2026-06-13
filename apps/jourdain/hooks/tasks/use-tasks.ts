"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/entities/tasks/api/endpoints";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@/entities/tasks/model/types";

export const tasksQueryKey = ["tasks"] as const;

export function useTasks() {
  return useQuery({
    queryKey: tasksQueryKey,
    queryFn: async (): Promise<Task[]> => {
      const result = await tasksApi.get.list();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const result = await tasksApi.post.create(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      taskId: string;
      input: UpdateTaskInput;
    }): Promise<Task> => {
      const result = await tasksApi.patch.update(args.taskId, args.input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const result = await tasksApi.delete.remove(taskId);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
