"use client";

import { useEffect, useRef, useState } from "react";

import { createBrowserClient } from "@/utils/supabase/client";

export interface GcBadges {
  fetched_at: string;
  player_level: number | null;
  cmd_friendly: number | null;
  cmd_teaching: number | null;
  cmd_leader: number | null;
  vac_banned: boolean | null;
  medals: unknown;
  rankings: unknown;
}

interface GcProfileResponse {
  snapshot: GcBadges | null;
  enqueued: boolean;
  pending: boolean;
}

/**
 * Loads the latest CS2 GC badge snapshot (enqueuing a bot job if stale) and
 * live-updates via Supabase Realtime on player_cs2_gc_snapshots. Falls back to
 * polling while a job is pending in case Realtime is unavailable.
 */
export function useGcBadges(steamid64: string | null | undefined) {
  const [badges, setBadges] = useState<GcBadges | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  /** True after the first profile API response (snapshot or empty). */
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!steamid64) {
      setInitialLoadDone(false);
      return;
    }
    setInitialLoadDone(false);
    let cancelled = false;

    async function enqueueAndLoad() {
      try {
        const res = await fetch(`/api/cs2/profile/${steamid64}`);
        if (!res.ok) throw new Error("Failed to load badges");
        const data: GcProfileResponse = await res.json();
        if (cancelled) return;
        if (data.snapshot) setBadges(data.snapshot);
        setPending(data.pending);
        setInitialLoadDone(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "error");
          setInitialLoadDone(true);
        }
      }
    }

    void enqueueAndLoad();

    const supabase = createBrowserClient();
    // Unique topic per hook instance so multiple mounted consumers (e.g. the
    // summary card + badges panel) don't collide on the same channel name.
    const channel = supabase
      .channel(`gc:${steamid64}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_cs2_gc_snapshots",
          filter: `steamid64=eq.${steamid64}`,
        },
        (payload: { new: GcBadges }) => {
          if (cancelled) return;
          setBadges(payload.new);
          setPending(false);
        },
      )
      .subscribe();

    // Poll fallback while a job is pending (covers Realtime drops).
    const poll = setInterval(() => {
      if (!pendingRef.current) return;
      void (async () => {
        try {
          const res = await fetch(`/api/cs2/profile/${steamid64}`);
          if (!res.ok) return;
          const data: GcProfileResponse = await res.json();
          if (cancelled) return;
          if (data.snapshot) {
            setBadges(data.snapshot);
            setPending(false);
          }
        } catch {
          // ignore; next tick retries
        }
      })();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [steamid64]);

  return { badges, pending, error, initialLoadDone };
}
