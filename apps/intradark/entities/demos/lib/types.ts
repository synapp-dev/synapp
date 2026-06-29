/**
 * Shared contract between the demo-parser API route and the DevTools harness.
 * Lives outside `insights.ts` (which is `server-only`) so the client can render
 * buttons and result panels without pulling in the native parser.
 */

/** Cell primitives we know how to render in the harness tables. */
export type DemoCell = string | number | boolean | null;

/** One curated "thing you can pull from a demo", rendered generically. */
export type InsightResult =
  | { kind: "kv"; pairs: [label: string, value: DemoCell][]; note?: string }
  | {
      kind: "table";
      columns: string[];
      rows: DemoCell[][];
      /** Optional caption, e.g. "showing 50 of 312 kills". */
      note?: string;
    }
  | { kind: "json"; data: unknown; note?: string };

// ── radar replay ─────────────────────────────────────────────────────────────

/** One player's state at a single replay frame (radar coords normalised 0..1). */
export type ReplayPlayer = {
  steamid: string;
  name: string;
  team: string;
  x: number;
  y: number;
  alive: boolean;
  health: number;
  /** View yaw in degrees, for a facing indicator. */
  yaw: number;
};

export type ReplayFrame = { tick: number; players: ReplayPlayer[] };

/** One sampled point of a grenade's flight (normalised radar coords). */
export type TrailPoint = { tick: number; x: number; y: number };

/** A grenade's flight path (throw → land), coloured by type on the radar. */
export type ReplayTrail = {
  kind: "he" | "smoke" | "fire" | "flash" | "decoy";
  points: TrailPoint[];
};

export type ReplayRound = { round: number; startTick: number; endTick: number };

/** One player's loadout/economy at a scoreboard sample (broadcast panel). */
export type LoadoutPlayer = {
  steamid: string;
  name: string;
  team: string;
  alive: boolean;
  health: number;
  armor: number;
  helmet: boolean;
  defuser: boolean;
  money: number;
  kills: number;
  assists: number;
  /** Weapon currently held. */
  activeWeapon: string;
  primary: string | null;
  secondary: string | null;
  /** Grenade short-codes held: HE, F, S, M, D. */
  nades: string[];
};

export type ScoreboardFrame = { tick: number; players: LoadoutPlayer[] };

/** Resolved identity for a demo player (intradark member + Steam). */
export type DemoPlayerProfile = {
  steamid64: string;
  /** Full-size avatar URL (Steam, or member avatar), or null if unresolved. */
  avatar: string | null;
  /** Steam persona name. */
  persona: string | null;
  /** ISO 3166-1 alpha-2 country code (lowercase), or null. */
  country: string | null;
  /** Linked intradark member @username, or null if not a member. */
  username: string | null;
  /** Intradark display name (display → first/last → username), or null. */
  displayName: string | null;
};

/**
 * A grenade effect on the radar (smoke cloud, molotov fire, HE/flash pop),
 * shown while `startTick <= playhead <= endTick`. Position + radius normalised
 * to 0..1 like players.
 */
export type ReplayEffect = {
  kind: "smoke" | "fire" | "he" | "flash";
  x: number;
  y: number;
  radius: number;
  startTick: number;
  endTick: number;
};

export type ReplayPayload = {
  mapSlug: string;
  /** False when we have no radar transform for this map yet. */
  supported: boolean;
  radarImageUrl: string | null;
  rounds: ReplayRound[];
  /** The round these frames belong to (1-based). */
  round: number;
  /** Playback frames-per-second the client should target. */
  fps: number;
  frames: ReplayFrame[];
  /** Grenade effects active during this round. */
  effects: ReplayEffect[];
  /** Lower-rate loadout/economy track for the broadcast panel. */
  scoreboard: ScoreboardFrame[];
  message?: string;
};

/** Catalog entry — metadata only, safe to import on the client. */
export type InsightMeta = {
  id: string;
  label: string;
  description: string;
  /** Loose grouping for the harness UI. */
  group: "Overview" | "Combat" | "Rounds" | "Utility" | "Raw";
  /** Parses every tick / is otherwise expensive — flag it in the UI. */
  heavy?: boolean;
};

/**
 * The insights offered by the DevTools demos panel, in display order. The
 * server registry in `insights.ts` keys its parser functions off these ids.
 */
export const DEMO_INSIGHTS: readonly InsightMeta[] = [
  {
    id: "header",
    label: "Match header",
    description: "Map, server, demo protocol, duration and playback metadata.",
    group: "Overview",
  },
  {
    id: "players",
    label: "Player roster",
    description: "Every player seen in the demo with Steam ID and team.",
    group: "Overview",
  },
  {
    id: "scoreboard",
    label: "Scoreboard (K/D/A)",
    description:
      "Per-player kills, deaths, assists, headshots and HS% aggregated from death events.",
    group: "Combat",
  },
  {
    id: "killfeed",
    label: "Kill feed",
    description: "Chronological kills: attacker, victim, weapon, headshot flag.",
    group: "Combat",
  },
  {
    id: "opening-duels",
    label: "Opening duels",
    description: "The first kill of every round — who drew first blood and how.",
    group: "Combat",
  },
  {
    id: "damage",
    label: "Damage dealt",
    description: "Total damage and hits each attacker dealt (from player_hurt).",
    group: "Combat",
  },
  {
    id: "round-timeline",
    label: "Round timeline",
    description: "Round-by-round winner side and end reason.",
    group: "Rounds",
  },
  {
    id: "bomb-events",
    label: "Bomb events",
    description: "Plants, defuses and detonations across the match.",
    group: "Rounds",
  },
  {
    id: "utility",
    label: "Utility usage",
    description: "Count of grenade detonations by type (HE, flash, smoke, molly).",
    group: "Utility",
  },
  {
    id: "weapon-fires",
    label: "Shots fired",
    description: "Total weapon_fire events grouped by weapon (top 25).",
    group: "Combat",
  },
  {
    id: "first-kill-snapshot",
    label: "Snapshot @ first kill",
    description:
      "Every player's position, health and team at the tick of the match's first kill.",
    group: "Rounds",
    heavy: true,
  },
  {
    id: "available-events",
    label: "Available game events",
    description: "All game-event names present in this demo (for exploration).",
    group: "Raw",
  },
];
