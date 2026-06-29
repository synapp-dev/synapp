import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { demoPathForToken, demoExists } from "@/entities/demos/lib/storage";
import { radarImagePath } from "@/entities/demos/lib/radar";
import {
  getMapSlug,
  buildRounds,
  buildFrames,
  buildEffects,
  buildScoreboard,
  transformForSlug,
} from "@/entities/demos/lib/replay";
import type { ReplayPayload } from "@/entities/demos/lib/types";

/**
 * POST /api/devtools/demos/replay   body: { token, round? }
 * Builds a 2D radar-replay payload for one round of an uploaded demo: round
 * windows, the map's radar image, and per-frame normalised player positions.
 * Native parser → Node runtime. Gated by `sandbox.access`.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  token: z.string(),
  round: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const denied = await guardDemoRoute();
  if (denied) return denied;

  let body;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Expected { token, round? }" }, { status: 400 });
  }
  if (!(await demoExists(body.token))) {
    return NextResponse.json({ error: "Demo not found — re-upload it." }, { status: 404 });
  }

  const path = demoPathForToken(body.token);

  try {
    const mapSlug = getMapSlug(path);
    const rounds = buildRounds(path);
    const transform = transformForSlug(mapSlug);

    if (!transform) {
      const payload: ReplayPayload = {
        mapSlug,
        supported: false,
        radarImageUrl: null,
        rounds,
        round: 1,
        fps: 0,
        frames: [],
        effects: [],
        scoreboard: [],
        message: `No radar transform for "${mapSlug}" yet — replay supports the standard map pool.`,
      };
      return NextResponse.json(payload);
    }

    const round = Math.min(Math.max(body.round ?? 1, 1), rounds.length || 1);
    const window = rounds[round - 1];
    if (!window) {
      return NextResponse.json(
        { error: "No rounds found in this demo." },
        { status: 422 },
      );
    }

    const { frames, fps } = buildFrames(
      path,
      window.startTick,
      window.endTick,
      transform,
    );
    const effects = buildEffects(path, window.startTick, window.endTick, transform);
    const scoreboard = buildScoreboard(path, window.startTick, window.endTick);

    const payload: ReplayPayload = {
      mapSlug,
      supported: true,
      // Standard 1024² overview the transform is defined against — NOT the
      // utility-module image, which is a differently-framed crop.
      radarImageUrl: radarImagePath(mapSlug),
      rounds,
      round,
      fps,
      frames,
      effects,
      scoreboard,
    };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Replay build failed" },
      { status: 500 },
    );
  }
}
