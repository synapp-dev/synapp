"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";

import Link from "next/link";

import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import type { ReactionAuthor } from "@/entities/reactions/lib/types";
import type {
  DemoPlayerProfile,
  LoadoutPlayer,
  ReplayEffect,
  ReplayPayload,
  ReplayPlayer,
  ReplayTrail,
  ScoreboardFrame,
} from "@/entities/demos/lib/types";

const CANVAS = 620;
const CT_COLOR = "#6ea8fe";
const T_COLOR = "#f5b14c";

const TRAIL_COLOR: Record<ReplayTrail["kind"], string> = {
  he: "#ffe48c",
  smoke: "#cfd2da",
  fire: "#ff7a3c",
  flash: "#ffffff",
  decoy: "#9ad27a",
};
const TRAIL_TAIL = 40; // ticks of visible tail behind the head (~0.6s)

/** Interpolated position along a trail at `tick` (clamped to the endpoints). */
function trailPosAt(pts: ReplayTrail["points"], tick: number): { x: number; y: number } {
  if (tick <= pts[0]!.tick) return pts[0]!;
  const lastP = pts[pts.length - 1]!;
  if (tick >= lastP.tick) return lastP;
  for (let i = 1; i < pts.length; i++) {
    const b = pts[i]!;
    if (b.tick >= tick) {
      const a = pts[i - 1]!;
      const f = (tick - a.tick) / (b.tick - a.tick || 1);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return lastP;
}

/**
 * Draw each grenade as a comet: a short tail trailing the (interpolated) head,
 * fading from head to tail. The head freezes at the landing point while the
 * tail catches up, so the whole thing dissipates ~`TRAIL_TAIL` ticks after it
 * lands rather than lingering the whole round.
 */
function drawTrails(ctx: CanvasRenderingContext2D, trails: ReplayTrail[], tick: number) {
  for (const tr of trails) {
    const pts = tr.points;
    const first = pts[0]!.tick;
    const last = pts[pts.length - 1]!.tick;
    const tailStart = tick - TRAIL_TAIL;
    if (tick < first || tailStart > last) continue; // not thrown yet / fully dissipated

    const headTick = Math.min(tick, last);
    const head = trailPosAt(pts, headTick);
    const color = TRAIL_COLOR[tr.kind];

    // Visible window: source points within the tail, then the head.
    const segPts: { x: number; y: number; tick: number }[] = pts.filter(
      (p) => p.tick > tailStart && p.tick <= headTick,
    );
    if (segPts.length === 0 || segPts[segPts.length - 1]!.tick < headTick) {
      segPts.push({ ...head, tick: headTick });
    }
    const tailEnd = trailPosAt(pts, Math.max(tailStart, first));
    segPts.unshift({ ...tailEnd, tick: Math.max(tailStart, first) });

    for (let i = 1; i < segPts.length; i++) {
      const p0 = segPts[i - 1]!;
      const p1 = segPts[i]!;
      const a = Math.max(0, Math.min(1, (p1.tick - tailStart) / TRAIL_TAIL));
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + 2 * a;
      ctx.beginPath();
      ctx.moveTo(p0.x * CANVAS, p0.y * CANVAS);
      ctx.lineTo(p1.x * CANVAS, p1.y * CANVAS);
      ctx.stroke();
    }

    const headAlpha = Math.max(0, Math.min(1, (headTick - tailStart) / TRAIL_TAIL));
    ctx.globalAlpha = headAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(head.x * CANVAS, head.y * CANVAS, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Shortest-path angular interpolation (degrees). */
function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

/**
 * Render grenade effects active at `tick`, beneath the player dots. Smoke and
 * fire are soft radial glows (fading in/out, fire flickers); HE is an expanding
 * ring; flash is a quick white pop.
 */
function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: ReplayEffect[],
  tick: number,
) {
  for (const fx of effects) {
    if (tick < fx.startTick || tick > fx.endTick) continue;
    const cx = fx.x * CANVAS;
    const cy = fx.y * CANVAS;
    const R = fx.radius * CANVAS;
    const age = tick - fx.startTick;
    const life = Math.max(1, fx.endTick - fx.startTick);
    const remaining = fx.endTick - tick;

    if (fx.kind === "smoke") {
      const a = 0.5 * Math.min(1, age / 48) * Math.min(1, remaining / 256);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `rgba(214,216,222,${a})`);
      g.addColorStop(0.7, `rgba(190,193,201,${a * 0.9})`);
      g.addColorStop(1, "rgba(190,193,201,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.kind === "fire") {
      const flick = 0.82 + 0.18 * Math.sin(tick * 0.6 + fx.x * 50);
      const a = 0.5 * Math.min(1, remaining / 64) * flick;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * flick);
      g.addColorStop(0, `rgba(255,184,64,${a})`);
      g.addColorStop(0.5, `rgba(240,92,30,${a * 0.85})`);
      g.addColorStop(1, "rgba(176,40,18,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * flick, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.kind === "he") {
      const prog = age / life;
      ctx.globalAlpha = (1 - prog) * 0.85;
      ctx.strokeStyle = "rgba(255,228,140,1)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.3 + 0.7 * prog), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === "flash") {
      const prog = age / life;
      ctx.globalAlpha = (1 - prog) * 0.85;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.5 + prog * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * 2D radar replay for an uploaded demo. Fetches one round at a time from
 * `/api/devtools/demos/replay` (8 keyframes/sec) and plays it back on a canvas,
 * interpolating between keyframes with requestAnimationFrame so motion is smooth
 * at the display's refresh rate without inflating the payload. DevTools PoC.
 */
export function DemoReplay({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = useState(false);

  const [payload, setPayload] = useState<ReplayPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Integer frame for the slider + counter; the float playback head lives in posRef.
  const [frameIdx, setFrameIdx] = useState(0);
  const posRef = useRef(0);

  // Steam identities (avatar/name/country), resolved once per demo.
  const [profiles, setProfiles] = useState<Record<string, DemoPlayerProfile>>({});

  // Grenade trails (opt-in; first fetch triggers the slow parseGrenades pass).
  const [trailsOn, setTrailsOn] = useState(false);
  const [trailsLoading, setTrailsLoading] = useState(false);
  const [roundTrails, setRoundTrails] = useState<ReplayTrail[]>([]);
  const trailCache = useRef<Map<number, ReplayTrail[]>>(new Map());

  const frameCount = payload?.frames.length ?? 0;
  const lastFrame = Math.max(0, frameCount - 1);

  // ── fetch a round ──────────────────────────────────────────────────────────
  const load = useCallback(
    async (wantRound: number) => {
      setLoading(true);
      setError(null);
      setPlaying(false);
      try {
        const res = await fetch("/api/devtools/demos/replay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, round: wantRound }),
        });
        const data = (await res.json()) as ReplayPayload & { error?: string };
        if (!res.ok) {
          setError(data.error ?? `HTTP ${res.status}`);
          setPayload(null);
          return;
        }
        setPayload(data);
        setRound(data.round);
        posRef.current = 0;
        setFrameIdx(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load replay");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  // Resolve Steam avatars/names/countries for this demo (once).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/devtools/demos/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.players)) {
          const map: Record<string, DemoPlayerProfile> = {};
          for (const p of data.players as DemoPlayerProfile[]) map[p.steamid64] = p;
          setProfiles(map);
        }
      } catch {
        /* avatars are best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── grenade trails (opt-in, cached per round) ───────────────────────────────
  const loadTrails = useCallback(
    async (r: number) => {
      const cached = trailCache.current.get(r);
      if (cached) {
        setRoundTrails(cached);
        return;
      }
      setTrailsLoading(true);
      try {
        const res = await fetch("/api/devtools/demos/trails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, round: r }),
        });
        const data = await res.json();
        const trails: ReplayTrail[] = res.ok && data.supported ? data.trails : [];
        trailCache.current.set(r, trails);
        setRoundTrails(trails);
      } catch {
        setRoundTrails([]);
      } finally {
        setTrailsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (trailsOn && payload?.supported) void loadTrails(round);
    else setRoundTrails([]);
  }, [trailsOn, round, payload?.supported, loadTrails]);

  // ── radar image ────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = payload?.radarImageUrl;
    if (!url) {
      imgRef.current = null;
      setImgReady(false);
      return;
    }
    setImgReady(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgReady(true);
    };
    img.onerror = () => setImgReady(false);
    img.src = url;
  }, [payload?.radarImageUrl]);

  // ── draw a (possibly fractional) playback position ──────────────────────────
  const drawAt = useCallback(
    (pos: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS, CANVAS);
      if (imgRef.current) {
        ctx.globalAlpha = 0.92;
        ctx.drawImage(imgRef.current, 0, 0, CANVAS, CANVAS);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#0b0b0c";
        ctx.fillRect(0, 0, CANVAS, CANVAS);
      }

      const frames = payload?.frames;
      if (!frames || frames.length === 0) return;

      const clamped = Math.max(0, Math.min(pos, frames.length - 1));
      const i = Math.floor(clamped);
      const j = Math.min(i + 1, frames.length - 1);
      const t = clamped - i;
      const a = frames[i];
      const b = frames[j];
      if (!a || !b) return;
      const bById = new Map<string, ReplayPlayer>(b.players.map((p) => [p.steamid, p]));

      // Grenade effects + flight trails, beneath the players, at the tick.
      const tick = a.tick + (b.tick - a.tick) * t;
      if (payload?.effects) drawEffects(ctx, payload.effects, tick);
      if (trailsOn && roundTrails.length) drawTrails(ctx, roundTrails, tick);

      for (const pa of a.players) {
        const pb = bById.get(pa.steamid) ?? pa;
        const x = (pa.x + (pb.x - pa.x) * t) * CANVAS;
        const y = (pa.y + (pb.y - pa.y) * t) * CANVAS;
        const color = pa.team === "CT" ? CT_COLOR : T_COLOR;

        if (!pa.alive) {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 4, y - 4);
          ctx.lineTo(x + 4, y + 4);
          ctx.moveTo(x + 4, y - 4);
          ctx.lineTo(x - 4, y + 4);
          ctx.stroke();
          ctx.globalAlpha = 1;
          continue;
        }

        const yaw = lerpAngle(pa.yaw, pb.yaw, t);
        const rad = (yaw * Math.PI) / 180;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(rad) * 11, y - Math.sin(rad) * 11);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "10px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(pa.name, x, y - 9);
      }
    },
    [payload, trailsOn, roundTrails],
  );

  // ── playback clock (rAF, interpolated) ──────────────────────────────────────
  useEffect(() => {
    if (!playing || frameCount === 0) return;
    const fps = payload?.fps || 8;
    let raf = 0;
    let last = performance.now();
    let lastUi = last;

    const loop = (now: number) => {
      // rAF's first timestamp can predate `last`; clamp so dt is never negative.
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      const pos = posRef.current + dt * fps * speed;
      if (pos >= lastFrame) {
        posRef.current = lastFrame;
        drawAt(lastFrame);
        setFrameIdx(lastFrame);
        setPlaying(false);
        return;
      }
      posRef.current = pos;
      drawAt(pos);
      if (now - lastUi > 80) {
        setFrameIdx(Math.floor(pos));
        lastUi = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, frameCount, lastFrame, payload?.fps, drawAt]);

  // Static draw when paused / scrubbing / first paint / image load.
  useEffect(() => {
    if (!playing) drawAt(posRef.current);
  }, [playing, drawAt, imgReady, frameIdx]);

  // ── render ───────────────────────────────────────────────────────────────
  if (loading && !payload) {
    return <p className="text-sm text-muted-foreground">Building replay…</p>;
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!payload) return null;
  if (!payload.supported) {
    return (
      <p className="text-sm text-muted-foreground">
        {payload.message ?? `No radar replay for ${payload.mapSlug}.`}
      </p>
    );
  }

  const frame = payload.frames[Math.min(frameIdx, lastFrame)];
  const alive = frame?.players.filter((p) => p.alive).length ?? 0;
  const sbFrame = frame ? pickScoreboard(payload.scoreboard, frame.tick) : null;

  return (
    <div className="space-y-3">
      {/* Round controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Round</span>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={round}
            disabled={loading}
            onChange={(e) => void load(Number(e.target.value))}
          >
            {payload.rounds.map((r) => (
              <option key={r.round} value={r.round}>
                {r.round}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={trailsOn}
            onChange={(e) => setTrailsOn(e.target.checked)}
          />
          <span className="text-muted-foreground">Trails</span>
        </label>
        {trailsLoading && (
          <span className="text-xs text-amber-500">computing trajectories (~20s)…</span>
        )}
        <span className="text-xs text-muted-foreground">
          {payload.mapSlug} · {payload.frames.length} keyframes @ {payload.fps} fps ·
          interpolated{loading ? " · loading…" : ""}
        </span>
      </div>

      {/* Canvas + broadcast panel */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-fit overflow-hidden rounded-md border bg-black">
          <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="block" />
          <div className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-xs text-white">
            <span style={{ color: CT_COLOR }}>● CT</span>{" "}
            <span style={{ color: T_COLOR }}>● T</span> · alive {alive}
            {frame ? ` · tick ${frame.tick}` : ""}
          </div>
        </div>
        {sbFrame && <LoadoutPanel frame={sbFrame} profiles={profiles} />}
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant={playing ? "secondary" : "default"}
          disabled={frameCount === 0}
          onClick={() => {
            if (posRef.current >= lastFrame) {
              posRef.current = 0;
              setFrameIdx(0);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <input
          type="range"
          min={0}
          max={lastFrame}
          value={frameIdx}
          onChange={(e) => {
            setPlaying(false);
            const v = Number(e.target.value);
            posRef.current = v;
            setFrameIdx(v);
          }}
          className="h-1.5 flex-1 min-w-[200px] cursor-pointer"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          speed
          <select
            className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {[0.5, 1, 2, 4].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {frameCount ? frameIdx + 1 : 0}/{frameCount}
        </span>
      </div>
    </div>
  );
}

/** Latest scoreboard sample at or before `tick` (frames sorted ascending). */
function pickScoreboard(scoreboard: ScoreboardFrame[], tick: number): ScoreboardFrame | null {
  let found: ScoreboardFrame | null = null;
  for (const f of scoreboard) {
    if (f.tick <= tick) found = f;
    else break;
  }
  return found ?? scoreboard[0] ?? null;
}

const NADE_STYLE: Record<string, string> = {
  HE: "bg-red-500/80",
  F: "bg-zinc-200/80 text-black",
  S: "bg-sky-400/80",
  M: "bg-orange-500/80",
  D: "bg-emerald-500/80",
};

/** ESL-style loadout/economy panel for the two teams at the current tick. */
function LoadoutPanel({
  frame,
  profiles,
}: {
  frame: ScoreboardFrame;
  profiles: Record<string, DemoPlayerProfile>;
}) {
  const ct = frame.players.filter((p) => p.team === "CT");
  const t = frame.players.filter((p) => p.team !== "CT");
  return (
    <div className="flex flex-1 gap-2 text-sm" style={{ minWidth: 360 }}>
      <TeamBlock label="Counter-Terrorists" color={CT_COLOR} players={ct} profiles={profiles} />
      <TeamBlock label="Terrorists" color={T_COLOR} players={t} profiles={profiles} />
    </div>
  );
}

function TeamBlock({
  label,
  color,
  players,
  profiles,
}: {
  label: string;
  color: string;
  players: LoadoutPlayer[];
  profiles: Record<string, DemoPlayerProfile>;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-md border">
      <div
        className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </div>
      <div className="divide-y">
        {players.map((p) => (
          <PlayerRow key={p.steamid} p={p} color={color} profile={profiles[p.steamid]} />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  color,
  profile,
}: {
  p: LoadoutPlayer;
  color: string;
  profile?: DemoPlayerProfile;
}) {
  const weapon = p.activeWeapon || p.primary || p.secondary || "—";
  // Prefer the linked intradark name; fall back to the in-game demo name.
  const label = profile?.displayName ?? p.name;
  const author: ReactionAuthor = {
    userId: p.steamid,
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? p.name,
    avatarUrl: profile?.avatar ?? null,
    countryFlag: null,
    steamid64: p.steamid,
  };
  return (
    <div className={`px-2 py-1.5 ${p.alive ? "" : "opacity-40"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {profile?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] uppercase text-muted-foreground"
              aria-hidden
            >
              {label.slice(0, 2)}
            </span>
          )}
          <UserHoverCard author={author}>
            <Link
              href={`/players/${p.steamid}`}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold hover:underline"
            >
              {label}
            </Link>
          </UserHoverCard>
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {p.kills}/{p.assists}
        </span>
      </div>
      <div className="my-1 h-1 overflow-hidden rounded bg-muted">
        <div
          className="h-1 rounded"
          style={{ width: `${Math.max(0, Math.min(100, p.health))}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="truncate">{p.alive ? weapon : "dead"}</span>
        <span className="shrink-0 font-medium text-emerald-500">${p.money}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
        {p.armor > 0 && (
          <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
            {p.helmet ? "K+H" : "K"}
          </span>
        )}
        {p.defuser && (
          <span className="rounded bg-sky-500/30 px-1 py-0.5 text-sky-300">kit</span>
        )}
        {p.secondary && (
          <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
            {p.secondary}
          </span>
        )}
        {p.nades.map((n, i) => (
          <span
            key={i}
            className={`rounded px-1 py-0.5 font-semibold ${NADE_STYLE[n] ?? "bg-muted"}`}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
