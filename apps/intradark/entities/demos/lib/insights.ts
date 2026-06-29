import "server-only";

import type { DemoCell, InsightResult } from "./types";
import { dp, type EventRow } from "./parser";

// ── helpers ────────────────────────────────────────────────────────────────

const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Real human steamid64s are long numeric strings; bots/world are "0"/empty. */
const isRealSteamId = (v: unknown): boolean => {
  const s = str(v);
  return s.length > 5 && s !== "0";
};
const pct = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
const ratio = (a: number, b: number): string => (b > 0 ? (a / b).toFixed(2) : a.toFixed(2));

/** CS2 team numbers → readable side. */
const sideOf = (team: unknown): string => {
  const n = num(team);
  if (n === 2) return "T";
  if (n === 3) return "CT";
  return str(team) || "—";
};

// ── insight registry ─────────────────────────────────────────────────────────

type Runner = (path: string) => InsightResult;

const RUNNERS: Record<string, Runner> = {
  header(path) {
    const h = dp.parseHeader(path);
    const order: string[] = [
      "map_name",
      "server_name",
      "demo_version_name",
      "client_name",
      "game_directory",
      "patch_version",
      "fullpackets_version",
    ];
    const seen = new Set(order);
    const pairs: [string, DemoCell][] = [];
    for (const key of order) {
      if (key in h) pairs.push([key, str(h[key])]);
    }
    for (const [key, value] of Object.entries(h)) {
      if (!seen.has(key)) pairs.push([key, str(value)]);
    }
    return { kind: "kv", pairs };
  },

  players(path) {
    const info = dp.parsePlayerInfo(path);
    const rows: DemoCell[][] = info.map((p) => [
      str(p.name),
      str(p.steamid),
      sideOf(p.team_number ?? p.team_num ?? p.team),
    ]);
    return {
      kind: "table",
      columns: ["Name", "Steam ID", "Team"],
      rows,
      note: `${rows.length} players`,
    };
  },

  scoreboard(path) {
    const deaths = dp.parseEvent(path, "player_death");
    type Stat = { name: string; k: number; d: number; a: number; hs: number };
    const stats = new Map<string, Stat>();
    const bump = (id: string, name: string): Stat => {
      let s = stats.get(id);
      if (!s) {
        s = { name, k: 0, d: 0, a: 0, hs: 0 };
        stats.set(id, s);
      }
      if (name) s.name = name;
      return s;
    };
    for (const e of deaths) {
      if (isRealSteamId(e.attacker_steamid)) {
        const s = bump(str(e.attacker_steamid), str(e.attacker_name));
        s.k += 1;
        if (e.headshot === true) s.hs += 1;
      }
      if (isRealSteamId(e.user_steamid)) bump(str(e.user_steamid), str(e.user_name)).d += 1;
      if (isRealSteamId(e.assister_steamid))
        bump(str(e.assister_steamid), str(e.assister_name)).a += 1;
    }
    const rows: DemoCell[][] = [...stats.entries()]
      .sort((a, b) => b[1].k - a[1].k)
      .map(([id, s]) => [s.name, id, s.k, s.d, s.a, ratio(s.k, s.d), s.hs, pct(s.hs, s.k)]);
    return {
      kind: "table",
      columns: ["Player", "Steam ID", "K", "D", "A", "K/D", "HS", "HS%"],
      rows,
      note: `${deaths.length} kills · ${rows.length} players`,
    };
  },

  killfeed(path) {
    const deaths = dp.parseEvent(path, "player_death", [], ["total_rounds_played"]);
    const cap = 200;
    const rows: DemoCell[][] = deaths
      .slice(0, cap)
      .map((e) => [
        num(e.total_rounds_played) + 1,
        num(e.tick),
        str(e.attacker_name) || "—",
        str(e.user_name),
        str(e.weapon),
        e.headshot === true,
      ]);
    return {
      kind: "table",
      columns: ["Round", "Tick", "Attacker", "Victim", "Weapon", "HS"],
      rows,
      note:
        deaths.length > cap
          ? `showing first ${cap} of ${deaths.length} kills`
          : `${deaths.length} kills`,
    };
  },

  "opening-duels"(path) {
    const deaths = dp.parseEvent(path, "player_death", [], ["total_rounds_played"]);
    const firstByRound = new Map<number, EventRow>();
    for (const e of deaths) {
      const round = num(e.total_rounds_played);
      const prev = firstByRound.get(round);
      if (!prev || num(e.tick) < num(prev.tick)) firstByRound.set(round, e);
    }
    const rows: DemoCell[][] = [...firstByRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, e]) => [
        round + 1,
        str(e.attacker_name) || "—",
        str(e.user_name),
        str(e.weapon),
        e.headshot === true,
      ]);
    return {
      kind: "table",
      columns: ["Round", "First kill by", "Victim", "Weapon", "HS"],
      rows,
      note: `${rows.length} rounds`,
    };
  },

  damage(path) {
    const hurts = dp.parseEvent(path, "player_hurt");
    const agg = new Map<string, { name: string; dmg: number; hits: number }>();
    for (const e of hurts) {
      if (!isRealSteamId(e.attacker_steamid)) continue;
      const id = str(e.attacker_steamid);
      let row = agg.get(id);
      if (!row) {
        row = { name: str(e.attacker_name), dmg: 0, hits: 0 };
        agg.set(id, row);
      }
      row.dmg += num(e.dmg_health);
      row.hits += 1;
    }
    const rows: DemoCell[][] = [...agg.values()]
      .sort((a, b) => b.dmg - a.dmg)
      .map((r) => [r.name, r.dmg, r.hits]);
    return {
      kind: "table",
      columns: ["Player", "Damage", "Hits"],
      rows,
      note: `${hurts.length} hurt events`,
    };
  },

  "round-timeline"(path) {
    // Warmup / reset fire a round_end with a null winner — skip those and number
    // the real rounds sequentially. `winner` already comes through as "CT"/"T".
    const ends = dp.parseEvent(path, "round_end").filter((e) => e.winner != null);
    const rows: DemoCell[][] = ends.map((e, i) => [
      i + 1,
      sideOf(e.winner),
      str(e.reason),
      num(e.tick),
    ]);
    return {
      kind: "table",
      columns: ["Round", "Winner", "Reason", "Tick"],
      rows,
      note: `${rows.length} rounds`,
    };
  },

  "bomb-events"(path) {
    const rows: EventRow[] = dp.parseEvents(path, [
      "bomb_planted",
      "bomb_defused",
      "bomb_exploded",
    ]);
    const counts = new Map<string, number>();
    const table: DemoCell[][] = rows
      .sort((a, b) => num(a.tick) - num(b.tick))
      .map((e) => {
        const name = str(e.event_name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
        return [num(e.tick), name.replace("bomb_", ""), str(e.user_name) || "—"];
      });
    const summary = [...counts.entries()].map(([k, v]) => `${k.replace("bomb_", "")}: ${v}`);
    return {
      kind: "table",
      columns: ["Tick", "Event", "Player"],
      rows: table,
      note: summary.join(" · ") || "no bomb events",
    };
  },

  utility(path) {
    const events = [
      "hegrenade_detonate",
      "flashbang_detonate",
      "smokegrenade_detonate",
      "molotov_detonate",
      "inferno_startburn",
      "decoy_detonate",
    ];
    const rows: EventRow[] = dp.parseEvents(path, events);
    const counts = new Map<string, number>();
    for (const e of rows) {
      const name = str(e.event_name);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const pretty: Record<string, string> = {
      hegrenade_detonate: "HE grenade",
      flashbang_detonate: "Flashbang",
      smokegrenade_detonate: "Smoke",
      molotov_detonate: "Molotov",
      inferno_startburn: "Fire started",
      decoy_detonate: "Decoy",
    };
    const table: DemoCell[][] = events
      .map((ev) => [pretty[ev] ?? ev, counts.get(ev) ?? 0] as DemoCell[])
      .filter((r) => num(r[1]) > 0);
    return {
      kind: "table",
      columns: ["Grenade", "Detonations"],
      rows: table,
      note: `${rows.length} total detonations`,
    };
  },

  "weapon-fires"(path) {
    const fires = dp.parseEvent(path, "weapon_fire");
    const counts = new Map<string, number>();
    for (const e of fires) {
      const w = str(e.weapon);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    const rows: DemoCell[][] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([w, c]) => [w, c]);
    return {
      kind: "table",
      columns: ["Weapon", "Shots"],
      rows,
      note: `${fires.length} shots · top ${rows.length} weapons`,
    };
  },

  "first-kill-snapshot"(path) {
    const deaths = dp.parseEvent(path, "player_death");
    if (deaths.length === 0) {
      return { kind: "kv", pairs: [["result", "no kills in demo"]] };
    }
    const tick = deaths.reduce(
      (min, e) => Math.min(min, num(e.tick)),
      num(deaths[0]!.tick),
    );
    // Try a rich prop set; fall back to the always-available basics if a prop
    // name isn't recognised for this demo build.
    let ticks: Array<Record<string, unknown>>;
    try {
      ticks = dp.parseTicks(path, ["X", "Y", "Z", "health", "team_name"], [tick]);
    } catch {
      ticks = dp.parseTicks(path, ["X", "Y", "Z", "health"], [tick]);
    }
    const rows: DemoCell[][] = ticks.map((t) => [
      str(t.name),
      sideOf(t.team_name ?? t.team_num),
      num(t.health),
      Math.round(num(t.X)),
      Math.round(num(t.Y)),
      Math.round(num(t.Z)),
    ]);
    return {
      kind: "table",
      columns: ["Player", "Team", "HP", "X", "Y", "Z"],
      rows,
      note: `snapshot at tick ${tick} (first kill)`,
    };
  },

  "available-events"(path) {
    const events = dp.listGameEvents(path).sort();
    return {
      kind: "table",
      columns: ["Game event"],
      rows: events.map((e) => [e]),
      note: `${events.length} event types in this demo`,
    };
  },
};

/** Run one curated insight against a demo file path. Throws if `id` is unknown. */
export function runInsight(id: string, path: string): InsightResult {
  const runner = RUNNERS[id];
  if (!runner) throw new Error(`Unknown insight: ${id}`);
  return runner(path);
}

export function isKnownInsight(id: string): boolean {
  return id in RUNNERS;
}
