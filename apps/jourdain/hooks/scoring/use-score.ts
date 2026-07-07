"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { DayScore } from "@/lib/scoring/compute";

export type ScoreResponse = { today: DayScore; history: DayScore[] };

export const scoreQueryKey = ["score"] as const;

/** Today's life score plus the trailing 30-day history, keyed by local day. */
export function useScore() {
  const date = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: [...scoreQueryKey, date],
    queryFn: async (): Promise<ScoreResponse> => {
      const result = await apiFetch<ScoreResponse>(`/score?date=${date}`);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 15_000,
  });
}

/** Day scores for an inclusive date range (server caps at 92 days). */
export function useScoreRange(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: [...scoreQueryKey, "range", from, to],
    queryFn: async (): Promise<DayScore[]> => {
      const result = await apiFetch<DayScore[]>(`/score?from=${from}&to=${to}`);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 15_000,
    enabled,
  });
}

export type ScoreSummary = {
  overall: number | null;
  daysTracked: number;
  monthAvg: number | null;
  weekAvg: number | null;
};

/** All-history averages (overall, month, week), keyed by local day. */
export function useScoreSummary() {
  const date = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: [...scoreQueryKey, "summary", date],
    queryFn: async (): Promise<ScoreSummary> => {
      const result = await apiFetch<ScoreSummary>(`/score/summary?date=${date}`);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });
}
