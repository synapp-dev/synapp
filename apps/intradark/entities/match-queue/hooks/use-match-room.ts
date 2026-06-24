"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { MatchView } from "./use-match";

/** Seeded pro bots occupy the 76561199000000201–220 block (see sim.ts). */
const SIM_BOT_PREFIX = "765611990000002";
const isSimBot = (steamid64: string) => steamid64.startsWith(SIM_BOT_PREFIX);

/**
 * Drives the live match room: polls /api/match/[id], idempotently pokes
 * /api/match/[id]/stage while the match is forming its lobby (§5/§6 — generates team
 * names + asks the Discord bot to create the team voice channels), and — in dev — has
 * the seeded bots "join Discord" on a stagger so the §6 phase completes without 9 real
 * humans. The signed-in player joins via `joinSelf` (opens the real lobby deep link).
 */
export function useMatchRoom(matchId: string) {
  const qc = useQueryClient();
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const simStarted = React.useRef(false);

  const query = useQuery<MatchView, Error>({
    queryKey: ["match", matchId],
    enabled: Boolean(matchId),
    queryFn: async () => {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error("Failed to load match");
      return res.json();
    },
    refetchInterval: 1500,
  });

  const match = query.data;
  const status = match?.status;
  const invalidate = React.useCallback(
    () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
    [qc, matchId],
  );

  React.useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Keep poking the staging endpoint while the lobby is forming (idempotent: creates
  // channels once, then advances staging → configuring on completion/deadline).
  React.useEffect(() => {
    if (!matchId) return;
    if (status !== "accepted" && status !== "staging") return;
    const poke = () =>
      fetch(`/api/match/${matchId}/stage`, { method: "POST" })
        .then(() => invalidate())
        .catch(() => {});
    poke();
    const t = setInterval(poke, 2500);
    return () => clearInterval(t);
  }, [matchId, status, invalidate]);

  // Dev: simulate the bots trickling into Discord voice during staging.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (status !== "staging" || !match || simStarted.current) return;
    const bots = match.roster.filter(
      (r) => isSimBot(r.steamid64) && !r.discordJoined,
    );
    if (bots.length === 0) return;
    simStarted.current = true;
    bots.forEach((b, i) => {
      const delay = 1200 + i * 1100 + Math.random() * 800;
      timers.current.push(
        setTimeout(() => {
          fetch("/api/sim/discord", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId,
              steamids: [b.steamid64],
              joined: true,
            }),
          })
            .then(() => invalidate())
            .catch(() => {});
        }, delay),
      );
    });
  }, [status, match, matchId, invalidate]);

  /** Mark the signed-in player as joined and open the real Discord lobby channel. */
  const joinSelf = React.useCallback(() => {
    if (!match?.you) return;
    if (match.discordLobbyUrl) {
      window.open(match.discordLobbyUrl, "_blank", "noopener,noreferrer");
    }
    fetch("/api/sim/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        steamids: [match.you.steamid64],
        joined: true,
      }),
    })
      .then(() => invalidate())
      .catch(() => {});
  }, [match, matchId, invalidate]);

  return { match, isLoading: query.isLoading, joinSelf };
}
