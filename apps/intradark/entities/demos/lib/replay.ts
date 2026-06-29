import "server-only";

import { dp } from "./parser";
import { radarTransformFor, worldToRadar, type RadarTransform } from "./radar";
import type {
  LoadoutPlayer,
  ReplayEffect,
  ReplayFrame,
  ReplayPlayer,
  ReplayRound,
  ScoreboardFrame,
} from "./types";

const TICK_RATE = 64; // CS2 demos record at 64 tick
const TARGET_FPS = 8; // smooth enough for a 2D radar, keeps payloads small
const MAX_FRAMES = 2500; // safety cap for very long rounds

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function getMapSlug(path: string): string {
  return String(dp.parseHeader(path).map_name ?? "");
}

/**
 * Pair each live-round start (`round_freeze_end`) with the first real
 * `round_end` after it. Warmup/reset round_ends carry a null winner and are
 * skipped. Rounds are numbered sequentially from 1.
 */
export function buildRounds(path: string): ReplayRound[] {
  const starts = dp
    .parseEvent(path, "round_freeze_end")
    .map((e) => num(e.tick))
    .sort((a, b) => a - b);
  const ends = dp
    .parseEvent(path, "round_end")
    .filter((e) => e.winner != null)
    .map((e) => num(e.tick))
    .sort((a, b) => a - b);

  const rounds: ReplayRound[] = [];
  for (const start of starts) {
    const end = ends.find((t) => t > start);
    if (end == null) break;
    rounds.push({ round: rounds.length + 1, startTick: start, endTick: end });
  }
  return rounds;
}

/** Frames-per-second + tick step that respect the MAX_FRAMES cap. */
function resolveStep(startTick: number, endTick: number): { step: number; fps: number } {
  const span = Math.max(1, endTick - startTick);
  let step = Math.round(TICK_RATE / TARGET_FPS); // 8
  if (span / step > MAX_FRAMES) step = Math.ceil(span / MAX_FRAMES);
  return { step, fps: Math.max(1, Math.round(TICK_RATE / step)) };
}

/**
 * Parse positional ticks across a round and project them onto the radar.
 * Returns frames ordered by tick, each holding every player's 0..1 position.
 */
export function buildFrames(
  path: string,
  startTick: number,
  endTick: number,
  transform: RadarTransform,
): { frames: ReplayFrame[]; fps: number } {
  const { step, fps } = resolveStep(startTick, endTick);
  const wanted: number[] = [];
  for (let t = startTick; t <= endTick; t += step) wanted.push(t);

  const rows = dp.parseTicks(
    path,
    ["X", "Y", "Z", "yaw", "health", "is_alive", "team_name"],
    wanted,
  );

  const byTick = new Map<number, ReplayPlayer[]>();
  for (const row of rows) {
    const tick = num(row.tick);
    const { x, y } = worldToRadar(num(row.X), num(row.Y), transform);
    const player: ReplayPlayer = {
      steamid: String(row.steamid ?? ""),
      name: String(row.name ?? ""),
      team: String(row.team_name ?? ""),
      x,
      y,
      alive: row.is_alive === true,
      health: num(row.health),
      yaw: num(row.yaw),
    };
    const bucket = byTick.get(tick);
    if (bucket) bucket.push(player);
    else byTick.set(tick, [player]);
  }

  const frames: ReplayFrame[] = [...byTick.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tick, players]) => ({ tick, players }));

  return { frames, fps };
}

/** Convenience: resolve the transform for a slug (null when unsupported). */
export function transformForSlug(slug: string): RadarTransform | null {
  return radarTransformFor(slug);
}

// ── scoreboard / loadout track ───────────────────────────────────────────────

const SCOREBOARD_STEP = 16; // ticks between loadout samples (~4 fps @ 64 tick)

const PRIMARY_WEAPONS = new Set([
  "AK-47", "M4A4", "M4A1-S", "AWP", "AUG", "SG 553", "Galil AR", "FAMAS",
  "SSG 08", "SCAR-20", "G3SG1", "MP9", "MAC-10", "MP7", "MP5-SD", "UMP-45",
  "P90", "PP-Bizon", "Nova", "XM1014", "Sawed-Off", "MAG-7", "M249", "Negev",
]);
const SECONDARY_WEAPONS = new Set([
  "USP-S", "Glock-18", "P2000", "P250", "Five-SeveN", "Tec-9", "CZ75-Auto",
  "Desert Eagle", "Dual Berettas", "R8 Revolver",
]);
const NADE_CODE: Record<string, string> = {
  "HE Grenade": "HE",
  Flashbang: "F",
  "Smoke Grenade": "S",
  "Incendiary Grenade": "M",
  Molotov: "M",
  "Decoy Grenade": "D",
};

/**
 * Per-player loadout/economy sampled at ~4 fps for the broadcast panel. Kept on
 * its own track (slower than positions) so high-rate position frames stay lean.
 */
export function buildScoreboard(
  path: string,
  startTick: number,
  endTick: number,
): ScoreboardFrame[] {
  const wanted: number[] = [];
  for (let t = startTick; t <= endTick; t += SCOREBOARD_STEP) wanted.push(t);

  const rows = dp.parseTicks(
    path,
    [
      "health",
      "is_alive",
      "team_name",
      "armor_value",
      "has_helmet",
      "has_defuser",
      "balance",
      "kills_total",
      "assists_total",
      "active_weapon_name",
      "inventory",
    ],
    wanted,
  );

  const byTick = new Map<number, LoadoutPlayer[]>();
  for (const r of rows) {
    const tick = num(r.tick);
    const items = Array.isArray(r.inventory) ? (r.inventory as string[]) : [];
    let primary: string | null = null;
    let secondary: string | null = null;
    const nades: string[] = [];
    for (const item of items) {
      if (PRIMARY_WEAPONS.has(item)) primary = item;
      else if (SECONDARY_WEAPONS.has(item)) secondary = item;
      else if (NADE_CODE[item]) nades.push(NADE_CODE[item]!);
    }
    const player: LoadoutPlayer = {
      steamid: String(r.steamid ?? ""),
      name: String(r.name ?? ""),
      team: String(r.team_name ?? ""),
      alive: r.is_alive === true,
      health: num(r.health),
      armor: num(r.armor_value),
      helmet: r.has_helmet === true,
      defuser: r.has_defuser === true,
      money: num(r.balance),
      kills: num(r.kills_total),
      assists: num(r.assists_total),
      activeWeapon: String(r.active_weapon_name ?? ""),
      primary,
      secondary,
      nades,
    };
    const bucket = byTick.get(tick);
    if (bucket) bucket.push(player);
    else byTick.set(tick, [player]);
  }

  return [...byTick.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tick, players]) => ({ tick, players }));
}

// Effect world radii (CS2 units) and short-pop lifetimes (ticks @ 64).
const FX_RADIUS = { smoke: 144, fire: 150, he: 100, flash: 80 };
const HE_POP_TICKS = 28;
const FLASH_POP_TICKS = 24;
const SMOKE_FALLBACK_TICKS = 18 * 64;
const FIRE_FALLBACK_TICKS = 7 * 64;

/**
 * Grenade effects (smoke clouds, molotov fire, HE/flash pops) within a round,
 * from a single `parseEvents` pass. Smoke/fire end-ticks are matched to their
 * `*_expired`/`inferno_expire` by `entityid`; pops get a short fixed lifetime.
 */
export function buildEffects(
  path: string,
  startTick: number,
  endTick: number,
  t: RadarTransform,
): ReplayEffect[] {
  const rows = dp.parseEvents(path, [
    "smokegrenade_detonate",
    "smokegrenade_expired",
    "inferno_startburn",
    "inferno_expire",
    "hegrenade_detonate",
    "flashbang_detonate",
  ]);

  const span = t.scale * 1024;
  const normRadius = (worldR: number) => worldR / span;

  // entityid → expire tick, for smoke and fire.
  const smokeExpire = new Map<number, number>();
  const fireExpire = new Map<number, number>();
  for (const e of rows) {
    if (e.event_name === "smokegrenade_expired") smokeExpire.set(num(e.entityid), num(e.tick));
    else if (e.event_name === "inferno_expire") fireExpire.set(num(e.entityid), num(e.tick));
  }

  const inWindow = (tick: number) => tick >= startTick && tick <= endTick;
  const effects: ReplayEffect[] = [];

  for (const e of rows) {
    const tick = num(e.tick);
    if (!inWindow(tick)) continue;
    const { x, y } = worldToRadar(num(e.x), num(e.y), t);

    if (e.event_name === "smokegrenade_detonate") {
      effects.push({
        kind: "smoke",
        x,
        y,
        radius: normRadius(FX_RADIUS.smoke),
        startTick: tick,
        endTick: smokeExpire.get(num(e.entityid)) ?? tick + SMOKE_FALLBACK_TICKS,
      });
    } else if (e.event_name === "inferno_startburn") {
      effects.push({
        kind: "fire",
        x,
        y,
        radius: normRadius(FX_RADIUS.fire),
        startTick: tick,
        endTick: fireExpire.get(num(e.entityid)) ?? tick + FIRE_FALLBACK_TICKS,
      });
    } else if (e.event_name === "hegrenade_detonate") {
      effects.push({
        kind: "he",
        x,
        y,
        radius: normRadius(FX_RADIUS.he),
        startTick: tick,
        endTick: tick + HE_POP_TICKS,
      });
    } else if (e.event_name === "flashbang_detonate") {
      effects.push({
        kind: "flash",
        x,
        y,
        radius: normRadius(FX_RADIUS.flash),
        startTick: tick,
        endTick: tick + FLASH_POP_TICKS,
      });
    }
  }
  return effects;
}
