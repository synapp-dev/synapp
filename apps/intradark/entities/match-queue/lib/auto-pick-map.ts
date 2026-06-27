import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { mapPools, maps, matches } from "@/server/db/schema";

import { DEFAULT_MAP_POOL_SLUG, selectMapSlug } from "./map-pick";

/**
 * §5.4 MVP map selection: auto-pick one map from the tier pool and write `matches.map`,
 * unblocking the loop without veto UI. **Idempotent** — if the match already has a map
 * (e.g. set by a re-run or by interactive veto later), it returns that unchanged.
 *
 * Interactive captain veto (P9) eventually replaces this, finalising `matches.map` from the
 * `match_veto_steps` ledger instead — but the write target is the same column.
 */
export async function autoPickMap(matchId: string): Promise<{ map: string }> {
  return db.transaction(async (tx) => {
    const [match] = await tx
      .select({ map: matches.map })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .for("update");

    if (!match) throw new Error(`Match ${matchId} not found`);
    if (match.map) return { map: match.map };

    const pool = await tx
      .select({ slug: maps.slug })
      .from(maps)
      .innerJoin(mapPools, eq(maps.poolId, mapPools.id))
      .where(
        and(eq(mapPools.slug, DEFAULT_MAP_POOL_SLUG), eq(maps.isActive, true)),
      );

    const picked = selectMapSlug(
      pool.map((p) => p.slug),
      Math.random(),
    );

    await tx
      .update(matches)
      .set({ map: picked, updatedAt: new Date().toISOString() })
      .where(eq(matches.id, matchId));

    return { map: picked };
  });
}
