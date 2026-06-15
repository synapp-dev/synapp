"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";

export type HealthMetricSample = {
  name: string;
  units: string | null;
  date: string;
  qty: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
};

export type SleepNight = {
  date: string;
  inBedStart: string | null;
  inBedEnd: string | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  totalSleep: number | null;
  rem: number | null;
  deep: number | null;
  core: number | null;
  awake: number | null;
  asleep: number | null;
  inBed: number | null;
};

export type Workout = {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  duration: number | null;
  totalEnergy: number | null;
  activeEnergy: number | null;
  distance: number | null;
  stepCount: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  intensity: number | null;
  isIndoor: boolean | null;
  location: string | null;
  temperature: number | null;
  humidity: number | null;
};

export type HealthImportSummary = {
  metrics: number;
  sleepNights: number;
  workouts: number;
};

export const healthMetricsQueryKey = ["health-metrics"] as const;
export const healthSleepQueryKey = ["health-sleep"] as const;
export const healthWorkoutsQueryKey = ["health-workouts"] as const;

/** Daily samples for the given metric names. Pass a stable list of names. */
export function useHealthMetrics(names: readonly string[]) {
  const key = [...names].sort().join(",");
  return useQuery({
    queryKey: [...healthMetricsQueryKey, key],
    queryFn: async (): Promise<HealthMetricSample[]> => {
      const result = await apiFetch<HealthMetricSample[]>(
        `/health/metrics?names=${encodeURIComponent(names.join(","))}`
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: names.length > 0,
    staleTime: 60_000,
  });
}

export function useSleepNights() {
  return useQuery({
    queryKey: healthSleepQueryKey,
    queryFn: async (): Promise<SleepNight[]> => {
      const result = await apiFetch<SleepNight[]>("/health/sleep");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useWorkouts() {
  return useQuery({
    queryKey: healthWorkoutsQueryKey,
    queryFn: async (): Promise<Workout[]> => {
      const result = await apiFetch<Workout[]>("/health/workouts");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useImportHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown): Promise<HealthImportSummary> => {
      const result = await apiFetch<HealthImportSummary>("/health/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthMetricsQueryKey });
      queryClient.invalidateQueries({ queryKey: healthSleepQueryKey });
      queryClient.invalidateQueries({ queryKey: healthWorkoutsQueryKey });
    },
  });
}
