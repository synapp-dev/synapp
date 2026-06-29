import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { AC_HEARTBEAT_INTERVAL_S } from "@/lib/ac/constants";
import { resolveDevice } from "@/lib/ac/device-auth";
import { db } from "@/server/db/drizzle";
import { acSessions, matchPlayers, matches } from "@/server/db/schema";

/**
 * AC liveness heartbeat. Authenticated by the device token. Creates a session on
 * first beat (no sessionId), then bumps last_heartbeat_at + heartbeat_count on each
 * subsequent beat. Correlates the player to their current match server-side (the
 * client never asserts which match it's in). See decision doc §Q4/Q5.
 *
 * No per-heartbeat table — this only mutates ac_sessions. Findings/deltas go to
 * /api/ac/events instead.
 */

const ACTIVE_MATCH_STATUSES = [
  "accepted",
  "staging",
  "configuring",
  "awaiting_connect",
  "live",
] as const;

const envSchema = z
  .object({
    tpmPresent: z.boolean().optional(),
    secureBoot: z.boolean().optional(),
    iommu: z.boolean().optional(),
    vbs: z.boolean().optional(),
    osBuild: z.string().max(128).optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  appVersion: z.string().max(32).optional(),
  steamid64: z.string().max(32).optional(),
  env: envSchema,
});

async function resolveCurrentMatchId(steamid64: string | undefined) {
  if (!steamid64) return null;
  const rows = await db
    .select({ matchId: matchPlayers.matchId })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .where(
      and(
        eq(matchPlayers.steamid64, steamid64),
        inArray(matches.status, [...ACTIVE_MATCH_STATUSES]),
      ),
    )
    .limit(1);
  return rows[0]?.matchId ?? null;
}

export async function POST(req: Request) {
  const auth = await resolveDevice(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, appVersion, steamid64, env } = parsed.data;
  const now = new Date().toISOString();

  try {
    const matchId = await resolveCurrentMatchId(steamid64);

    // Environment columns only updated when the client reports them.
    const envCols = env
      ? {
          tpmPresent: env.tpmPresent ?? null,
          secureBoot: env.secureBoot ?? null,
          iommu: env.iommu ?? null,
          vbs: env.vbs ?? null,
          osBuild: env.osBuild ?? null,
          envRaw: env.raw ?? {},
        }
      : {};

    if (sessionId) {
      const [updated] = await db
        .update(acSessions)
        .set({
          lastHeartbeatAt: now,
          heartbeatCount: sql`${acSessions.heartbeatCount} + 1`,
          matchId,
          ...(appVersion ? { appVersion } : {}),
          ...(steamid64 ? { steamid64 } : {}),
          ...envCols,
          status: "active",
        })
        .where(and(eq(acSessions.id, sessionId), eq(acSessions.userId, auth.userId)))
        .returning({ id: acSessions.id });

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: "Unknown session" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        sessionId: updated.id,
        matchId,
        intervalS: AC_HEARTBEAT_INTERVAL_S,
      });
    }

    // First beat of a run — create the session.
    const [created] = await db
      .insert(acSessions)
      .values({
        deviceId: auth.deviceId,
        userId: auth.userId,
        steamid64: steamid64 ?? null,
        matchId,
        appVersion: appVersion ?? null,
        lastHeartbeatAt: now,
        heartbeatCount: 1,
        status: "active",
        ...envCols,
      })
      .returning({ id: acSessions.id });

    if (!created) {
      return NextResponse.json(
        { ok: false, error: "Heartbeat failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      sessionId: created.id,
      matchId,
      intervalS: AC_HEARTBEAT_INTERVAL_S,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ac/heartbeat]", message);
    return NextResponse.json({ ok: false, error: "Heartbeat failed" }, { status: 500 });
  }
}
