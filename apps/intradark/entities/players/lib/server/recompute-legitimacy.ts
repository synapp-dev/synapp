import { track } from "@vercel/analytics/server";

import { computeLegitimacy } from "@/entities/players/lib/legitimacy/score";
import type { LegitimacyResult } from "@/entities/players/lib/legitimacy/types";
import {
  buildLegitimacyInput,
  type LegitimacySourceRows,
} from "@/entities/players/lib/server/build-legitimacy-input";
import { isLegitimacyScoringEnabled } from "@/entities/players/lib/server/legitimacy-config";
import { createAdminClient } from "@/utils/supabase/admin";

export interface LegitimacyScoreRow {
  steamid64: string;
  score: number;
  tier: string;
  confidence: string;
  coverage: number;
  breakdown: LegitimacyResult["breakdown"];
  computed_at: string;
}

async function loadSourceRows(
  steamid64: string,
): Promise<LegitimacySourceRows> {
  const admin = createAdminClient();

  const [steamRes, leetifyRes, faceitRes, gcRes, playerRes] = await Promise.all([
    admin
      .from("steam_profiles")
      .select(
        "timecreated, communityvisibilitystate, realname, avatarfull, vac_banned, game_banned, community_banned, economy_ban, ban_age_days, cs2_playtime_minutes, badge_count, steam_level, friends_count",
      )
      .eq("steamid64", steamid64)
      .maybeSingle(),
    admin
      .from("player_leetify_snapshots")
      .select(
        "raw, leetify_rating, aim, positioning, utility, games_played, premier_rating",
      )
      .eq("steamid64", steamid64)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("player_faceit_snapshots")
      .select("raw, faceit_elo, skill_level")
      .eq("steamid64", steamid64)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("player_cs2_gc_snapshots")
      .select("vac_banned, player_level")
      .eq("steamid64", steamid64)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("players")
      .select("user_profile_id")
      .eq("steamid64", steamid64)
      .maybeSingle(),
  ]);

  let platform: LegitimacySourceRows["platform"] = null;
  if (playerRes.data?.user_profile_id) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("discord_user_id, is_verified")
      .eq("id", playerRes.data.user_profile_id)
      .maybeSingle();
    platform = profile ?? null;
  }

  return {
    steam: steamRes.data ?? null,
    leetify: leetifyRes.data ?? null,
    faceit: faceitRes.data ?? null,
    gc: gcRes.data ?? null,
    platform,
  };
}

function coverageBucket(coverage: number): "low" | "med" | "high" {
  if (coverage < 0.34) return "low";
  if (coverage < 0.67) return "med";
  return "high";
}

/**
 * Recompute and upsert the current legitimacy row for a player.
 * No-op when LEGITIMACY_SCORING_ENABLED=false. Never throws to callers.
 */
export async function recomputeLegitimacy(
  steamid64: string,
): Promise<LegitimacyResult | null> {
  if (!isLegitimacyScoringEnabled()) return null;

  try {
    const rows = await loadSourceRows(steamid64);
    const input = buildLegitimacyInput(steamid64, rows);
    const result = computeLegitimacy(input);

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin.from("player_legitimacy_scores").upsert(
      {
        steamid64,
        score: result.score,
        tier: result.tier,
        confidence: result.confidence,
        coverage: result.coverage,
        breakdown: result.breakdown,
        computed_at: now,
        updated_at: now,
      },
      { onConflict: "steamid64" },
    );

    if (error) {
      console.error("[legitimacy] upsert failed", error.message);
      return null;
    }

    try {
      await track("player_legitimacy_recomputed", {
        tier: result.tier,
        confidence_band: result.confidence,
        coverage_bucket: coverageBucket(result.coverage),
      });
    } catch (e) {
      console.warn("[legitimacy] analytics track failed", e);
    }

    return result;
  } catch (e) {
    console.error("[legitimacy] recompute failed", e);
    return null;
  }
}

export async function getLegitimacyScore(
  steamid64: string,
): Promise<LegitimacyScoreRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("player_legitimacy_scores")
    .select("steamid64, score, tier, confidence, coverage, breakdown, computed_at")
    .eq("steamid64", steamid64)
    .maybeSingle();
  return data ?? null;
}
