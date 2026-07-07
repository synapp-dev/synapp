"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/fetcher.client";
import type {
  BodyWeightEntry,
  LogBodyWeightInput,
  CreateExerciseInput,
  CreateProgramInput,
  Exercise,
  ExerciseHistoryEntry,
  ExerciseStandards,
  GymSchedule,
  GymSet,
  LogSetInput,
  MuscleSummary,
  Program,
  Session,
  SessionPreviewExercise,
  SessionSummary,
  StartSessionInput,
  UpdateExerciseInput,
  UpdateProgramInput,
  UpdateSetInput,
} from "@/entities/gym/model/types";
import { routinesQueryKey } from "@/hooks/routines/use-routines";
import { tasksQueryKey } from "@/hooks/tasks/use-tasks";

export const gymKeys = {
  exercises: ["gym", "exercises"] as const,
  programs: ["gym", "programs"] as const,
  schedule: ["gym", "schedule"] as const,
  sessions: ["gym", "sessions"] as const,
  session: (id: string) => ["gym", "session", id] as const,
  activeSession: ["gym", "session", "active"] as const,
  history: (exerciseId: string) => ["gym", "history", exerciseId] as const,
  muscleSummary: ["gym", "muscle-summary"] as const,
  standards: ["gym", "standards"] as const,
  bodyWeights: ["gym", "bodyweight"] as const,
  exerciseBests: ["gym", "exercise-bests"] as const,
};

async function get<T>(path: string): Promise<T> {
  const result = await apiFetch<T>(path);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const result = await apiFetch<T>(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ── Exercises ────────────────────────────────────────────────────────────────
export function useExercises(includeArchived = false) {
  return useQuery({
    queryKey: [...gymKeys.exercises, includeArchived],
    queryFn: () =>
      get<Exercise[]>(`/gym/exercises${includeArchived ? "?includeArchived=1" : ""}`),
    staleTime: 60_000,
  });
}

export function useSeedExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => send<{ inserted: number }>("/gym/exercises/seed", "POST"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: gymKeys.exercises });
      toast.success(
        data.inserted > 0
          ? `Loaded ${data.inserted} G20 exercises`
          : "Starter library already loaded"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseInput) =>
      send<Exercise>("/gym/exercises", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.exercises }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExerciseInput }) =>
      send<Exercise>(`/gym/exercises/${id}`, "PATCH", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.exercises }),
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Optimistic favourite toggle — favourites are weighted up by smart-fill. */
export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favourite }: { id: string; favourite: boolean }) =>
      send<Exercise>(`/gym/exercises/${id}`, "PATCH", { isFavourite: favourite }),
    onMutate: async ({ id, favourite }) => {
      await qc.cancelQueries({ queryKey: gymKeys.exercises });
      qc.setQueriesData<Exercise[]>({ queryKey: gymKeys.exercises }, (old) =>
        old?.map((e) => (e.id === id ? { ...e, isFavourite: favourite } : e))
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: gymKeys.exercises }),
    onSettled: () => qc.invalidateQueries({ queryKey: gymKeys.exercises }),
  });
}

export function useArchiveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => send<Exercise>(`/gym/exercises/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.exercises }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Programs ─────────────────────────────────────────────────────────────────
export function usePrograms() {
  return useQuery({
    queryKey: gymKeys.programs,
    queryFn: () => get<Program[]>("/gym/programs"),
    staleTime: 60_000,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgramInput) =>
      send<Program>("/gym/programs", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.programs }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProgramInput }) =>
      send<Program>(`/gym/programs/${id}`, "PATCH", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.programs }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => send<{ id: string }>(`/gym/programs/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: gymKeys.programs }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Schedule (weekly PPL rotation) ────────────────────────────────────────────
export function useSchedule() {
  return useQuery({
    queryKey: gymKeys.schedule,
    queryFn: () => get<GymSchedule>("/gym/schedule"),
    staleTime: 60_000,
  });
}

export function useSetScheduleDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dayOfWeek: number; programId: string | null }) =>
      send<GymSchedule>("/gym/schedule", "PUT", input),
    onSuccess: (schedule) => {
      qc.setQueryData(gymKeys.schedule, schedule);
      qc.invalidateQueries({ queryKey: routinesQueryKey });
      qc.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetTrainingReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { enabled: boolean; remindTime?: string }) =>
      send<GymSchedule>("/gym/schedule/reminder", "POST", input),
    onSuccess: (schedule) => {
      qc.setQueryData(gymKeys.schedule, schedule);
      qc.invalidateQueries({ queryKey: routinesQueryKey });
      qc.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Fetch the exercise list a session would start with (start-wizard preview).
 *  A mutation so smart programs can "Regenerate" for a fresh roll. */
export function useSessionPreview() {
  return useMutation({
    mutationFn: (programId: string) =>
      send<SessionPreviewExercise[]>(`/gym/programs/${programId}/preview`, "POST"),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export function useSessions() {
  return useQuery({
    queryKey: gymKeys.sessions,
    queryFn: () => get<SessionSummary[]>("/gym/sessions"),
    staleTime: 30_000,
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: gymKeys.activeSession,
    queryFn: () => get<Session | null>("/gym/sessions?active=1"),
    staleTime: 10_000,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: gymKeys.session(id ?? "none"),
    queryFn: () => get<Session>(`/gym/sessions/${id}`),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartSessionInput) =>
      send<Session>("/gym/sessions", "POST", input),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: gymKeys.sessions });
      qc.invalidateQueries({ queryKey: gymKeys.activeSession });
      qc.setQueryData(gymKeys.session(session.id), session);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { status?: "active" | "completed"; notes?: string | null; title?: string }) =>
      send<Session>(`/gym/sessions/${sessionId}`, "PATCH", input),
    onSuccess: (session) => {
      qc.setQueryData(gymKeys.session(sessionId), session);
      qc.invalidateQueries({ queryKey: gymKeys.sessions });
      qc.invalidateQueries({ queryKey: gymKeys.activeSession });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddSessionExercise(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: string) =>
      send<Session>(`/gym/sessions/${sessionId}/exercises`, "POST", { exerciseId }),
    onSuccess: (session) => qc.setQueryData(gymKeys.session(sessionId), session),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Sets ─────────────────────────────────────────────────────────────────────
export function useLogSet(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogSetInput) => send<GymSet>("/gym/sets", "POST", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gymKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: gymKeys.muscleSummary });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSet(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSetInput }) =>
      send<GymSet>(`/gym/sets/${id}`, "PATCH", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gymKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: gymKeys.muscleSummary });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSet(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => send<{ id: string }>(`/gym/sets/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gymKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: gymKeys.muscleSummary });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── History ──────────────────────────────────────────────────────────────────
export function useExerciseHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: gymKeys.history(exerciseId ?? "none"),
    queryFn: () => get<ExerciseHistoryEntry[]>(`/gym/exercises/${exerciseId}/history`),
    enabled: !!exerciseId,
    staleTime: 30_000,
  });
}

export function useMuscleSummary() {
  return useQuery({
    queryKey: gymKeys.muscleSummary,
    queryFn: () => get<MuscleSummary[]>("/gym/muscle-summary"),
    staleTime: 30_000,
  });
}

// ── Strength standards + bodyweight ───────────────────────────────────────────
export function useStandards() {
  return useQuery({
    queryKey: gymKeys.standards,
    queryFn: () => get<ExerciseStandards[]>("/gym/standards"),
    staleTime: 60 * 60 * 1000, // reference data; rarely changes
    select: (rows) => new Map(rows.map((r) => [r.slug, r])),
  });
}

/** Best all-time est-1RM per exercise id — drives muscle strength ratings. */
export function useExerciseBests() {
  return useQuery({
    queryKey: gymKeys.exerciseBests,
    queryFn: () => get<Record<string, number>>("/gym/exercise-bests"),
    staleTime: 30_000,
  });
}

export function useBodyWeights() {
  return useQuery({
    queryKey: gymKeys.bodyWeights,
    queryFn: () => get<BodyWeightEntry[]>("/gym/bodyweight"),
    staleTime: 60_000,
  });
}

// ── Demo data ─────────────────────────────────────────────────────────────────
export function useDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "generate" | "clear") =>
      send<{ sets: number }>("/gym/demo", "POST", { action }),
    onSuccess: (data, action) => {
      qc.invalidateQueries({ queryKey: ["gym"] });
      toast.success(
        action === "generate" ? `Generated ${data.sets} demo sets` : "Demo data cleared"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useLogBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogBodyWeightInput) =>
      send<BodyWeightEntry>("/gym/bodyweight", "POST", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gymKeys.bodyWeights });
      toast.success("Weigh-in logged");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
