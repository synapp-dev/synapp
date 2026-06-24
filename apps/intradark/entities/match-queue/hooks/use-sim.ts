"use client";

import * as React from "react";

import type { QueueLeague } from "../lib/leagues";

/**
 * Client-side conductor for the PUG loop simulation. It uses the real endpoints —
 * /api/queue to put *you* in the pool, /api/sim/queue to trickle the 9 bots in over
 * ~30s (so the real §3 matchmaker pops the match), and /api/sim/decisions to make the
 * bots accept/decline per the chosen scenario (so the real §4 resolution runs). The
 * ready-check dialog itself reads /api/match/[id] independently — this hook only
 * drives the actors, it doesn't render the lobby.
 */

export type SimBot = {
  steamid64: string;
  alias: string;
  realName: string | null;
  avatarUrl: string | null;
  country: string | null;
  rating: number;
};

export type BotScenario = "all_accept" | "all_decline" | "n_decline" | "random";

export type SimPhase = "idle" | "filling" | "ready" | "stopped";

const BOT_COUNT = 9;
const FILL_WINDOW_MS = 30_000;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function useSimController() {
  const [phase, setPhase] = React.useState<SimPhase>("idle");
  const [log, setLog] = React.useState<string[]>([]);
  const [matchId, setMatchId] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<SimBot[]>([]);

  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const decisionsScheduled = React.useRef(false);

  const pushLog = React.useCallback((line: string) => {
    setLog((l) => [...l.slice(-40), line]);
  }, []);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const after = React.useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const clearLocal = React.useCallback(() => {
    clearTimers();
    decisionsScheduled.current = false;
    setPhase("idle");
    setMatchId(null);
    setChosen([]);
    setLog([]);
  }, [clearTimers]);

  const postReset = React.useCallback(async (keepCooldowns: boolean) => {
    await fetch("/api/sim/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepCooldowns }),
    }).catch(() => {});
  }, []);

  /** Full clean slate, including any dodge cooldowns (panel "Reset", new run). */
  const reset = React.useCallback(async () => {
    clearLocal();
    await postReset(false);
  }, [clearLocal, postReset]);

  /** Dismiss a resolved match but preserve cooldowns so the gate stays testable. */
  const dismiss = React.useCallback(async () => {
    clearLocal();
    await postReset(true);
  }, [clearLocal, postReset]);

  const stop = React.useCallback(async () => {
    clearTimers();
    setPhase("stopped");
    await fetch("/api/sim/reset", { method: "POST" }).catch(() => {});
  }, [clearTimers]);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  /** Schedule each bot's accept/decline once the match has formed. */
  const scheduleDecisions = React.useCallback(
    (id: string, bots: SimBot[], scenario: BotScenario, declineCount: number) => {
      if (decisionsScheduled.current) return;
      decisionsScheduled.current = true;

      const order = shuffle(bots);
      let decliners: Set<string>;
      if (scenario === "all_decline") {
        decliners = new Set(order.map((b) => b.steamid64));
      } else if (scenario === "all_accept") {
        decliners = new Set();
      } else if (scenario === "n_decline") {
        decliners = new Set(
          order.slice(0, Math.min(declineCount, order.length)).map((b) => b.steamid64),
        );
      } else {
        decliners = new Set(
          order.filter(() => Math.random() < 0.2).map((b) => b.steamid64),
        );
      }

      for (const bot of order) {
        const decline = decliners.has(bot.steamid64);
        const delay = decline ? rand(3500, 7000) : rand(1500, 10_000);
        after(delay, () => {
          fetch("/api/sim/decisions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId: id,
              accept: decline ? [] : [bot.steamid64],
              decline: decline ? [bot.steamid64] : [],
            }),
          })
            .then((r) => r.json())
            .then(() =>
              pushLog(`${bot.alias} ${decline ? "declined ✗" : "accepted ✓"}`),
            )
            .catch(() => {});
        });
      }
    },
    [after, pushLog],
  );

  const start = React.useCallback(
    async (opts: {
      league: QueueLeague;
      scenario: BotScenario;
      declineCount: number;
    }) => {
      await reset();
      setPhase("filling");
      pushLog("Resetting queue & cooldowns…");

      // 1. Put *you* in the pool first (real queue join).
      const joinRes = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league: opts.league }),
      });
      const joinData = (await joinRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!joinRes.ok || joinData.ok === false) {
        pushLog(`Couldn't join queue: ${joinData.error ?? "error"}`);
        setPhase("idle");
        return;
      }
      pushLog(`You joined the ${opts.league} queue.`);

      // 2. Pick 9 bots.
      const botsRes = await fetch("/api/sim/bots");
      const { bots = [] } = (await botsRes.json().catch(() => ({ bots: [] }))) as {
        bots: SimBot[];
      };
      const picked = shuffle(bots).slice(0, BOT_COUNT);
      setChosen(picked);
      pushLog(`${picked.length} pros will trickle in over 30s…`);

      // 3. Stagger their joins across the fill window (sorted so the lobby grows).
      const offsets = picked
        .map(() => rand(800, FILL_WINDOW_MS))
        .sort((a, b) => a - b);
      picked.forEach((bot, i) => {
        after(offsets[i]!, () => {
          fetch("/api/sim/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ league: opts.league, steamids: [bot.steamid64] }),
          })
            .then((r) => r.json())
            .then((data: { matchId?: string | null }) => {
              pushLog(`${bot.alias} joined the queue.`);
              if (data.matchId) {
                setMatchId(data.matchId);
                setPhase("ready");
                pushLog("Match found — ready check!");
                // 4. Drive bot ready-check decisions.
                scheduleDecisions(
                  data.matchId,
                  picked,
                  opts.scenario,
                  opts.declineCount,
                );
              }
            })
            .catch(() => {});
        });
      });
    },
    [after, pushLog, reset, scheduleDecisions],
  );

  return { phase, log, matchId, chosen, start, stop, reset, dismiss };
}
