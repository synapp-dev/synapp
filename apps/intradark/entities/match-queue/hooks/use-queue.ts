"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { QueueLeague } from "../lib/leagues";

export type QueueStatusResponse = {
  pool: Record<QueueLeague, number>;
  you: { status: string; league: string; matchId: string | null } | null;
  eligibility: { eligible: boolean; reason: string | null };
};

export type JoinQueueResponse = {
  ok: boolean;
  entryId?: string;
  league?: QueueLeague;
  alreadyQueued?: boolean;
  matchId?: string | null;
  error?: string;
};

const QUEUE_KEY = ["queue"] as const;

/** Poll live queue status (pool counts + your entry + eligibility). */
export function useQueueStatus(options?: { refetchInterval?: number }) {
  return useQuery<QueueStatusResponse, Error>({
    queryKey: [...QUEUE_KEY, "status"],
    queryFn: async () => {
      const res = await fetch("/api/queue");
      if (!res.ok) throw new Error("Failed to load queue status");
      return res.json();
    },
    refetchInterval: options?.refetchInterval ?? 3000,
  });
}

export function useJoinQueue() {
  const queryClient = useQueryClient();
  return useMutation<JoinQueueResponse, Error, { league: QueueLeague }>({
    mutationFn: async ({ league }) => {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league }),
      });
      const data = (await res.json()) as JoinQueueResponse;
      if (!res.ok) throw new Error(data.error ?? "Could not join queue");
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });
}

export function useLeaveQueue() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true; left: boolean }, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/queue", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not leave queue");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });
}
