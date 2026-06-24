"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AcceptStatus = "pending" | "accepted" | "declined" | "timeout";

export type MatchRosterPlayer = {
  steamid64: string;
  team: number | null;
  name: string;
  realName: string | null;
  avatarUrl: string | null;
  country: string | null;
  rating: number | null;
  acceptStatus: AcceptStatus;
  isYou: boolean;
  discordJoined: boolean;
  connected: boolean;
  discordLinked: boolean;
};

export type MatchView = {
  matchId: string;
  seq: number;
  status: string;
  league: string;
  acceptDeadline: string | null;
  stagingDeadline: string | null;
  cancelReason: string | null;
  team1Name: string | null;
  team2Name: string | null;
  discordTeam1ChannelId: string | null;
  discordTeam2ChannelId: string | null;
  discordLobbyUrl: string | null;
  you: { steamid64: string; acceptStatus: AcceptStatus; team: number | null } | null;
  counts: {
    accepted: number;
    declined: number;
    pending: number;
    total: number;
    discordJoined: number;
    connected: number;
  };
  roster: MatchRosterPlayer[];
};

/** Poll a forming match's accept-phase state (~1s) while the ready-check is open. */
export function useMatch(matchId: string | null) {
  return useQuery<MatchView, Error>({
    queryKey: ["match", matchId],
    enabled: Boolean(matchId),
    queryFn: async () => {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error("Failed to load match");
      return res.json();
    },
    refetchInterval: 1000,
  });
}

/** Submit the signed-in player's accept/decline for the ready-check. */
export function useAcceptMatch(matchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, "accept" | "decline">({
    mutationFn: async (decision) => {
      const res = await fetch(`/api/match/${matchId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not submit decision");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
