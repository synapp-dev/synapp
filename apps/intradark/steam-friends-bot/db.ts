/**
 * Supabase service-role data access for the friends bot worker. Mirrors how
 * cs2-gc-bot talks to the DB (admin client, RLS bypassed). All identifiers are
 * snake_case to match the column names returned by supabase-js.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PrefColumn =
  | "notify_match"
  | "notify_news"
  | "notify_scrim"
  | "notify_broadcast";

export interface DmJob {
  id: string;
  kind: "direct" | "broadcast";
  category: string;
  steamid64: string | null;
  payload: Record<string, unknown>;
  dedup_key: string | null;
  status: string;
  attempts: number;
}

export function createDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export class BotDb {
  constructor(private readonly sb: SupabaseClient) {}

  // --- Job queue -------------------------------------------------------------

  async queuedJobs(limit = 20): Promise<DmJob[]> {
    const { data, error } = await this.sb
      .from("steam_dm_jobs")
      .select("id, kind, category, steamid64, payload, dedup_key, status, attempts")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as DmJob[];
  }

  /** Atomically claim a queued job; returns false if another worker got it first. */
  async claimJob(id: string): Promise<boolean> {
    const { data, error } = await this.sb
      .from("steam_dm_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued")
      .select("id");
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }

  async finishJob(id: string, ok: boolean, errMsg?: string): Promise<void> {
    await this.sb
      .from("steam_dm_jobs")
      .update({
        status: ok ? "done" : "error",
        error: ok ? null : (errMsg ?? "unknown"),
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  /**
   * Startup recovery: a worker that died mid-job leaves rows stuck `running`.
   * Match jobs are time-bound (their window is long gone) → mark done. Other
   * jobs → requeue so their remaining sends are retried (the deliveries ledger
   * prevents double-sends).
   */
  async recoverStaleJobs(): Promise<void> {
    await this.sb
      .from("steam_dm_jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("status", "running")
      .eq("category", "match");
    await this.sb
      .from("steam_dm_jobs")
      .update({ status: "queued", started_at: null })
      .eq("status", "running")
      .neq("category", "match");
  }

  // --- Deliveries ledger -----------------------------------------------------

  async existingDeliveries(jobId: string): Promise<Set<string>> {
    const { data } = await this.sb
      .from("steam_dm_deliveries")
      .select("steamid64")
      .eq("job_id", jobId);
    return new Set((data ?? []).map((r: { steamid64: string }) => r.steamid64));
  }

  async recordDelivery(jobId: string, steamid64: string): Promise<void> {
    await this.sb
      .from("steam_dm_deliveries")
      .upsert({ job_id: jobId, steamid64 }, { onConflict: "job_id,steamid64", ignoreDuplicates: true });
    await this.touchLastDm(steamid64);
  }

  async touchLastDm(steamid64: string): Promise<void> {
    await this.sb
      .from("steam_friends")
      .update({ last_dm_at: new Date().toISOString() })
      .eq("steamid64", steamid64);
  }

  // --- Friendship + prefs ----------------------------------------------------

  async upsertFriend(steamid64: string, userId: string | null): Promise<void> {
    await this.sb
      .from("steam_friends")
      .upsert(
        { steamid64, user_id: userId, friend_status: "active" },
        { onConflict: "steamid64" },
      );
  }

  async markFriendRemoved(steamid64: string): Promise<void> {
    await this.sb
      .from("steam_friends")
      .update({ friend_status: "removed" })
      .eq("steamid64", steamid64);
  }

  /** Resolve a steamid64 → the linked auth user_id (via user_profiles), or null. */
  async linkedUserId(steamid64: string): Promise<string | null> {
    const { data } = await this.sb
      .from("user_profiles")
      .select("user_id")
      .eq("steam_profile_id", steamid64)
      .maybeSingle();
    return (data as { user_id: string } | null)?.user_id ?? null;
  }

  /** Create a default (all-on) prefs row for a user if none exists. */
  async ensurePrefs(userId: string): Promise<void> {
    await this.sb
      .from("steam_notification_prefs")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  }

  /**
   * Filter candidate steamid64s to those who are active bot friends with a linked
   * user whose given preference is on (a missing prefs row defaults to on).
   */
  async eligibleRecipients(candidates: string[], col: PrefColumn): Promise<string[]> {
    const unique = [...new Set(candidates)].filter(Boolean);
    if (unique.length === 0) return [];

    const { data: friends } = await this.sb
      .from("steam_friends")
      .select("steamid64, user_id")
      .eq("friend_status", "active")
      .not("user_id", "is", null)
      .in("steamid64", unique);

    const rows = (friends ?? []) as { steamid64: string; user_id: string }[];
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: prefs } = await this.sb
      .from("steam_notification_prefs")
      .select(`user_id, ${col}`)
      .in("user_id", userIds);

    const off = new Set(
      ((prefs ?? []) as Record<string, unknown>[])
        .filter((p) => p[col] === false)
        .map((p) => p.user_id as string),
    );

    return rows.filter((r) => !off.has(r.user_id)).map((r) => r.steamid64);
  }

  async isEligible(steamid64: string, col: PrefColumn): Promise<boolean> {
    return (await this.eligibleRecipients([steamid64], col)).length > 0;
  }

  /** Every active, linked friend's steamid64 (news / broadcast candidate pool). */
  async allActiveFriendSteamIds(): Promise<string[]> {
    const { data } = await this.sb
      .from("steam_friends")
      .select("steamid64")
      .eq("friend_status", "active")
      .not("user_id", "is", null);
    return (data ?? []).map((r: { steamid64: string }) => r.steamid64);
  }

  // --- Match accept status (drives + stops the countdown) ---------------------

  async acceptState(
    matchId: string,
    steamid64: string,
  ): Promise<{ matchStatus: string | null; playerStatus: string | null }> {
    const [{ data: m }, { data: p }] = await Promise.all([
      this.sb.from("matches").select("status").eq("id", matchId).maybeSingle(),
      this.sb
        .from("match_players")
        .select("accept_status")
        .eq("match_id", matchId)
        .eq("steamid64", steamid64)
        .maybeSingle(),
    ]);
    return {
      matchStatus: (m as { status: string } | null)?.status ?? null,
      playerStatus: (p as { accept_status: string } | null)?.accept_status ?? null,
    };
  }

  raw(): SupabaseClient {
    return this.sb;
  }
}
