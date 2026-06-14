"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey } from "@/hooks/tasks/use-tasks";

export type RoutineDomain =
  | "identity"
  | "health"
  | "work"
  | "social"
  | "finance";
export type RoutineFreq = "daily" | "weekly" | "monthly";

export type Routine = {
  id: string;
  title: string;
  notes: string | null;
  domain: RoutineDomain;
  priority: number;
  freq: RoutineFreq;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  remindTime: string;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoutineInput = {
  title: string;
  notes?: string | null;
  domain: RoutineDomain;
  priority?: number;
  freq: RoutineFreq;
  daysOfWeek?: number[];
  dayOfMonth?: number | null;
  remindTime: string;
  timezone?: string;
  active?: boolean;
};

export type UpdateRoutineInput = Partial<CreateRoutineInput>;

export const routinesQueryKey = ["routines"] as const;

export function useRoutines() {
  return useQuery({
    queryKey: routinesQueryKey,
    queryFn: async (): Promise<Routine[]> => {
      const result = await apiFetch<Routine[]>("/routines");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoutineInput): Promise<Routine> => {
      const result = await apiFetch<Routine>("/routines", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      routineId: string;
      input: UpdateRoutineInput;
    }): Promise<Routine> => {
      const result = await apiFetch<Routine>(`/routines/${args.routineId}`, {
        method: "PATCH",
        body: JSON.stringify(args.input),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routineId: string): Promise<void> => {
      const result = await apiFetch<{ deleted: boolean }>(
        `/routines/${routineId}`,
        { method: "DELETE" }
      );
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
