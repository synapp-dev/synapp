import "server-only";

import { readFile, writeFile } from "node:fs/promises";

import { dp } from "./parser";
import { getMapSlug, buildRounds, transformForSlug } from "./replay";
import { worldToRadar, type RadarTransform } from "./radar";
import { demoSidecarPath } from "./storage";
import type { ReplayRound, ReplayTrail, TrailPoint } from "./types";

const MAX_POINTS = 48; // even-sampled cap per flight
const GAP_TICKS = 32; // a tick gap this big = entity id reused by a new grenade
const SETTLE_R = 18; // within this radius for SETTLE_HOLD pts = it has landed
const SETTLE_HOLD = 6;
const MAX_FLIGHT_TICKS = 320; // hard cap (~5s) so a persistent entity can't run on
const num = (v: unknown): number => (v == null ? 0 : Number(v));

type RawPoint = { tick: number; x: number; y: number };

/** First index where the projectile settles (stays put) — i.e. it has landed. */
function landingIndex(seg: RawPoint[]): number {
  for (let i = 1; i < seg.length; i++) {
    let settled = true;
    for (let j = i + 1; j <= Math.min(seg.length - 1, i + SETTLE_HOLD); j++) {
      if (Math.hypot(seg[j]!.x - seg[i]!.x, seg[j]!.y - seg[i]!.y) > SETTLE_R) {
        settled = false;
        break;
      }
    }
    if (settled) return i;
  }
  return seg.length - 1;
}

/** Cached whole-demo trails + round windows (one file per uploaded demo). */
type TrailCache = { rounds: ReplayRound[]; trails: ReplayTrail[] };

function kindOf(type: string): ReplayTrail["kind"] | null {
  if (type.includes("Smoke")) return "smoke";
  if (type.includes("Molotov") || type.includes("Incendiary")) return "fire";
  if (type.includes("HE")) return "he";
  if (type.includes("Flash")) return "flash";
  if (type.includes("Decoy")) return "decoy";
  return null;
}

/**
 * Build flight trails for the whole demo. This is the expensive bit:
 * `parseGrenades` scans every grenade entity on every tick (~20s+), so the
 * result is cached to a sidecar JSON and reused across rounds / requests.
 */
function buildTrailCache(path: string, t: RadarTransform): TrailCache {
  const rounds = buildRounds(path);
  const rows = dp.parseGrenades(path);

  // Group projectile positions by entity.
  const byEnt = new Map<number, { kind: ReplayTrail["kind"]; pts: TrailPoint[] }>();
  for (const r of rows) {
    if (r.x == null) continue;
    const type = String(r.grenade_type);
    if (!type.includes("Projectile")) continue;
    const kind = kindOf(type);
    if (!kind) continue;
    const id = num(r.grenade_entity_id);
    let entry = byEnt.get(id);
    if (!entry) {
      entry = { kind, pts: [] };
      byEnt.set(id, entry);
    }
    entry.pts.push({ tick: num(r.tick), x: num(r.x), y: num(r.y) });
  }

  const trails: ReplayTrail[] = [];
  for (const { kind, pts } of byEnt.values()) {
    pts.sort((a, b) => a.tick - b.tick);

    // grenade_entity_id is recycled across the demo, so one id's stream holds
    // many separate grenades. Split on tick gaps (entity absent → reused), then
    // each segment is one real throw.
    let seg: RawPoint[] = [];
    const flush = () => {
      if (seg.length >= 2) {
        const flight = seg.slice(0, landingIndex(seg) + 1);
        const cap = flight[0]!.tick + MAX_FLIGHT_TICKS;
        const trimmed = flight.filter((p) => p.tick <= cap);
        if (trimmed.length >= 2) {
          // Even-sample to <= MAX_POINTS, always keeping the landing point.
          const step = Math.max(1, Math.ceil(trimmed.length / MAX_POINTS));
          const kept: TrailPoint[] = [];
          for (let i = 0; i < trimmed.length; i += step) {
            const n = worldToRadar(trimmed[i]!.x, trimmed[i]!.y, t);
            kept.push({ tick: trimmed[i]!.tick, x: n.x, y: n.y });
          }
          const landing = trimmed[trimmed.length - 1]!;
          if (kept[kept.length - 1]!.tick !== landing.tick) {
            const n = worldToRadar(landing.x, landing.y, t);
            kept.push({ tick: landing.tick, x: n.x, y: n.y });
          }
          trails.push({ kind, points: kept });
        }
      }
      seg = [];
    };
    for (const p of pts) {
      if (seg.length && p.tick - seg[seg.length - 1]!.tick > GAP_TICKS) flush();
      seg.push(p);
    }
    flush();
  }
  return { rounds, trails };
}

async function loadOrBuild(path: string, token: string, t: RadarTransform): Promise<TrailCache> {
  // v2: flight-splitting fix (entity ids are recycled across the demo).
  const file = demoSidecarPath(token, "grenades.v2.json");
  try {
    return JSON.parse(await readFile(file, "utf8")) as TrailCache;
  } catch {
    const cache = buildTrailCache(path, t);
    await writeFile(file, JSON.stringify(cache)).catch(() => {});
    return cache;
  }
}

/** Trails whose flight overlaps the given round's tick window. */
export async function getRoundTrails(
  path: string,
  token: string,
  round: number,
): Promise<{ supported: boolean; trails: ReplayTrail[] }> {
  const transform = transformForSlug(getMapSlug(path));
  if (!transform) return { supported: false, trails: [] };

  const cache = await loadOrBuild(path, token, transform);
  const win = cache.rounds[Math.min(Math.max(round, 1), cache.rounds.length) - 1];
  if (!win) return { supported: true, trails: [] };

  const trails = cache.trails.filter((tr) => {
    const first = tr.points[0]!.tick;
    const last = tr.points[tr.points.length - 1]!.tick;
    return first <= win.endTick && last >= win.startTick;
  });
  return { supported: true, trails };
}
