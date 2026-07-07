"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

function applyTaskPatch(task: Task, input: UpdateTaskInput): Task {
  const next: Task = { ...task };
  if (input.title !== undefined) next.title = input.title;
  if (input.notes !== undefined) next.notes = input.notes ?? null;
  if (input.domains !== undefined) next.domains = input.domains;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.dueDate !== undefined) next.dueDate = input.dueDate ?? null;
  if (input.projectId !== undefined) next.projectId = input.projectId ?? null;
  if (input.remindAt !== undefined) next.remindAt = input.remindAt ?? null;
  if (input.status !== undefined) {
    next.status = input.status;
    next.completedAt =
      input.status === "done" ? new Date().toISOString() : null;
  }
  return next;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const result = await tasksApi.post.create(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });
      const previous = queryClient.getQueryData<Task[]>(tasksQueryKey);
      const now = new Date().toISOString();
      const optimistic: Task = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        notes: input.notes ?? null,
        status: "open",
        priority: input.priority ?? 4,
        domains: input.domains ?? [],
        dueDate: input.dueDate ?? null,
        projectId: input.projectId ?? null,
        remindAt: input.remindAt ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<Task[]>(tasksQueryKey, (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(tasksQueryKey, context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't add task");
    },
    onSettled: () => {
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
    onMutate: async ({ taskId, input }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });
      const previous = queryClient.getQueryData<Task[]>(tasksQueryKey);
      queryClient.setQueryData<Task[]>(tasksQueryKey, (old) =>
        (old ?? []).map((task) =>
          task.id === taskId ? applyTaskPatch(task, input) : task
        )
      );
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

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const result = await tasksApi.delete.remove(taskId);
      if (result.error) throw new Error(result.error.message);
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });
      const previous = queryClient.getQueryData<Task[]>(tasksQueryKey);
      queryClient.setQueryData<Task[]>(tasksQueryKey, (old) =>
        (old ?? []).filter((task) => task.id !== taskId)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(tasksQueryKey, context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't delete task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
