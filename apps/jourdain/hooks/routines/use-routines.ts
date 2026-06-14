"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey } from "@/hooks/tasks/use-tasks";

export type RoutineDomain =
  | "identity"
  | "health"
  | "work"
  | "social"
  | "finance";
export type RoutineFreq = "daily" | "weekly" | "monthly" | "interval";
export type RoutineTrigger = "schedule" | "on_complete";

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
  intervalMinutes: number | null;
  windowStart: string;
  windowEnd: string;
  nextFireAt: string | null;
  lastAckedAt: string | null;
  triggerType: RoutineTrigger;
  parentRoutineId: string | null;
  offsetMinutes: number | null;
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
  remindTime?: string;
  timezone?: string;
  active?: boolean;
  intervalMinutes?: number | null;
  windowStart?: string;
  windowEnd?: string;
  triggerType?: RoutineTrigger;
  parentRoutineId?: string | null;
  offsetMinutes?: number | null;
};

export type UpdateRoutineInput = Partial<CreateRoutineInput>;

export const routinesQueryKey = ["routines"] as const;

function applyRoutinePatch(
  routine: Routine,
  input: UpdateRoutineInput
): Routine {
  const next: Routine = { ...routine };
  if (input.title !== undefined) next.title = input.title;
  if (input.notes !== undefined) next.notes = input.notes ?? null;
  if (input.domain !== undefined) next.domain = input.domain;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.freq !== undefined) next.freq = input.freq;
  if (input.daysOfWeek !== undefined) next.daysOfWeek = input.daysOfWeek;
  if (input.dayOfMonth !== undefined) next.dayOfMonth = input.dayOfMonth ?? null;
  if (input.remindTime !== undefined) next.remindTime = input.remindTime;
  if (input.timezone !== undefined) next.timezone = input.timezone;
  if (input.active !== undefined) next.active = input.active;
  if (input.intervalMinutes !== undefined)
    next.intervalMinutes = input.intervalMinutes ?? null;
  if (input.windowStart !== undefined) next.windowStart = input.windowStart;
  if (input.windowEnd !== undefined) next.windowEnd = input.windowEnd;
  if (input.triggerType !== undefined) next.triggerType = input.triggerType;
  if (input.parentRoutineId !== undefined)
    next.parentRoutineId = input.parentRoutineId ?? null;
  if (input.offsetMinutes !== undefined)
    next.offsetMinutes = input.offsetMinutes ?? null;
  return next;
}

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
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Couldn't create routine"
      );
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
    onMutate: async ({ routineId, input }) => {
      await queryClient.cancelQueries({ queryKey: routinesQueryKey });
      const previous = queryClient.getQueryData<Routine[]>(routinesQueryKey);
      queryClient.setQueryData<Routine[]>(routinesQueryKey, (old) =>
        (old ?? []).map((routine) =>
          routine.id === routineId
            ? applyRoutinePatch(routine, input)
            : routine
        )
      );
      return { previous };
    },
    onError: (err, _args, context) => {
      if (context?.previous)
        queryClient.setQueryData(routinesQueryKey, context.previous);
      toast.error(
        err instanceof Error ? err.message : "Couldn't update routine"
      );
    },
    onSettled: () => {
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
    onMutate: async (routineId) => {
      await queryClient.cancelQueries({ queryKey: routinesQueryKey });
      const previous = queryClient.getQueryData<Routine[]>(routinesQueryKey);
      queryClient.setQueryData<Routine[]>(routinesQueryKey, (old) =>
        (old ?? []).filter((routine) => routine.id !== routineId)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(routinesQueryKey, context.previous);
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete routine"
      );
    },
    onSuccess: () => toast.success("Routine deleted"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: routinesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

/** Fetch a single routine — used by the ping ("Got it") card. */
export function usePingRoutine(routineId: string | null) {
  return useQuery({
    queryKey: ["ping-routine", routineId],
    queryFn: async (): Promise<Routine> => {
      const result = await apiFetch<Routine>(`/routines/${routineId}`);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: routineId !== null,
    staleTime: 0,
  });
}

export function useAckPing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routineId: string): Promise<Routine> => {
      const result = await apiFetch<Routine>(`/routines/${routineId}/ack`, {
        method: "POST",
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't acknowledge");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: routinesQueryKey });
    },
  });
}
