"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BODY_FRONT_PATHS,
  BODY_FRONT_VIEWBOX,
  type BodyPath,
} from "@/lib/gym/body-front.data";
import { BODY_BACK_PATHS } from "@/lib/gym/body-back.data";
import { STRENGTH_LEVEL_META } from "@/lib/gym/standards";
import {
  MUSCLE_SUBGROUP_LABELS,
  MUSCLE_SUBGROUPS,
  SUBGROUP_TO_GROUP,
  type LiftStanding,
  type MuscleGroup,
  type MuscleSubgroup,
} from "@/entities/gym/model/types";

// Front + back muscle map, selectable per SUBGROUP.
// - Overview (nothing selected): zinc silhouette outline + every muscle in a
//   muted zinc tone. Hovering a muscle previews its group: the hovered muscle
//   lightens (zinc-600), its siblings lighten less (zinc-700), everything else
//   darkens (zinc-900), and the hovered figure's silhouette lightens (zinc-500).
// - A subgroup selected: that subgroup keeps its vivid status colour and gently
//   pulses; its siblings in the same group dim to muted-foreground; muscles in
//   other groups go transparent (revealing just the silhouette outline).
// Selecting the already-selected subgroup toggles back to the overview (handled
// by the parent). All fills are solid at full opacity — no fillOpacity — so paths
// that overlap (e.g. the abs) never stack and look lighter than their neighbours.

const SILHOUETTE = "#52525b"; // body outline (zinc-600)
const SILHOUETTE_HOVER = "#71717a"; // hovered figure's outline (zinc-500, 100 lighter)
const OVERVIEW_MUSCLE = "#27272a"; // muscles in the overview (zinc-800)
const HOVER_OTHER = "#18181b"; // everything else recedes (zinc-900, 100 darker)
const SIBLING = "#52525b"; // same-group siblings of the selection (zinc-600)

// Load-in intro, three timed phases across the whole body at once:
//   search — every muscle flashes random colours AND pulses its opacity 0→100,
//            like it's searching; then, one subgroup at a time in a random
//            order, each "finds" its real score colour and locks in solid;
//   blink  — once every part is locked, the whole body blink-flashes its real
//            colours (2 fast blinks, then 1 slower), settles solid and holds;
//            the parent uses this beat to count the strength bars up (staggered);
//   fade   — everything fades slowly to the overview grey, back to normal.
const SEARCH_FLASH_LEAD_MS = 1000; // all muscles flash this long before locking
const SEARCH_STAGGER_MS = 50; // gap between successive parts locking in
const SEARCH_END_HOLD_MS = 350; // beat after the last lock before the blink
const BLINK_ANIM_MS = 900; // the blink flashes themselves (gym-muscle-blink)
const BLINK_HOLD_MS = 3000; // hold solid on the real colours after blinking
const INTRO_BLINK_MS = BLINK_ANIM_MS + BLINK_HOLD_MS;
const INTRO_FADE_MS = 1200; // slow settle back to grey
const INTRO_FLASH_INTERVAL_MS = 90; // how often the search colours reshuffle
const FLASH_PALETTE = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

type IntroPhase = "search" | "blink" | "fade" | null;

// Deterministic per-muscle, per-tick colour so each part flashes independently.
function flashColor(seed: number, tick: number): string {
  const h = (seed * 2654435761 + tick * 1103515245 + 12345) >>> 0;
  return FLASH_PALETTE[h % FLASH_PALETTE.length]!;
}

// The back art's viewBox is narrower (relative to its height) than the front's,
// so width-constrained it would render taller. Pad it horizontally — no crop —
// so both bodies render at the same height. Derived from the body bounding boxes.
const FRONT_VIEWBOX = BODY_FRONT_VIEWBOX;
const BACK_VIEWBOX = "-17.08 0 560.55 1176.29";

type Side = "front" | "back";
type Hover = { subgroup: MuscleSubgroup; side: Side } | null;

function Figure({
  paths,
  viewBox,
  label,
  side,
  subStandings,
  selectedSubgroup,
  highlightGroup,
  highlightAll,
  highlightSubgroups,
  introPhase,
  flashTick,
  lockedSubgroups,
  enterAnim,
  enterDelayMs,
  hovered,
  onSelect,
  onHover,
}: {
  paths: BodyPath[];
  viewBox: string;
  label: string;
  side: Side;
  subStandings: Record<MuscleSubgroup, LiftStanding>;
  selectedSubgroup: MuscleSubgroup | null;
  highlightGroup: MuscleGroup | null;
  highlightAll: boolean;
  /** When set, exactly these subgroups light up (the rest recede). */
  highlightSubgroups: Set<MuscleSubgroup> | null;
  introPhase: IntroPhase;
  flashTick: number;
  /** During the search phase, subgroups that have already locked to their colour. */
  lockedSubgroups: Set<MuscleSubgroup>;
  /** Mount entrance: front slides down, back slides up (see gym-figure-* keyframes). */
  enterAnim: "down" | "up";
  enterDelayMs: number;
  hovered: Hover;
  onSelect: (subgroup: MuscleSubgroup) => void;
  onHover: (hover: Hover) => void;
}) {
  const selectedGroup = selectedSubgroup
    ? SUBGROUP_TO_GROUP[selectedSubgroup]
    : null;
  const colorOf = (sg: MuscleSubgroup) =>
    STRENGTH_LEVEL_META[subStandings[sg] ?? "untrained"].color;

  // In the overview, the hovered figure's silhouette lightens.
  const silhouetteFill =
    !selectedGroup && hovered && hovered.side === side
      ? SILHOUETTE_HOVER
      : SILHOUETTE;

  return (
    <div
      className="flex flex-1 flex-col items-center gap-1.5"
      style={{
        animation: `gym-figure-${enterAnim} 1.1s ease-out ${enterDelayMs}ms both`,
      }}
    >
      <svg
        viewBox={viewBox}
        className="block h-auto w-full max-w-[189px]"
        role="img"
        aria-label={`${label} muscle map`}
        onMouseLeave={() => onHover(null)}
      >
        {paths.map((p, i) => {
          // Skin paths are the outline layer (body contour + muscle-detail cuts
          // such as the abs); they always render as the silhouette.
          if (p.kind === "skin" || !p.subgroup)
            return <path key={i} d={p.d} fill={silhouetteFill} />;

          const subgroup = p.subgroup;
          const selected = selectedSubgroup === subgroup;
          const hoveredThis = hovered?.subgroup === subgroup;

          // Intro overrides everything: a CSS-driven fill so the fade is smooth.
          let introStyle: CSSProperties | undefined;
          // Whether this part is still hunting for its colour (search phase, not
          // yet locked) — it keeps flashing; once locked it snaps to its colour.
          const searching = introPhase === "search" && !lockedSubgroups.has(subgroup);
          if (introPhase) {
            const seed = i + (side === "back" ? 131 : 0);
            let introFill: string;
            if (introPhase === "search") {
              introFill = lockedSubgroups.has(subgroup)
                ? colorOf(subgroup) // found it — lock to the real colour
                : flashColor(seed, flashTick); // still searching
            } else if (introPhase === "blink") {
              introFill = colorOf(subgroup);
            } else {
              introFill = OVERVIEW_MUSCLE; // fade
            }
            introStyle = {
              fill: introFill,
              transition:
                introPhase === "fade"
                  ? `fill ${INTRO_FADE_MS}ms ease-out`
                  : searching
                    ? "none" // colours snap each tick while searching
                    : "fill 200ms ease-out", // gentle settle on lock / blink
              // While searching, each muscle pulses its opacity (see the
              // gym-muscle-flash class). Offset the cycle per-muscle so they
              // shimmer independently instead of strobing in unison.
              ...(searching ? { animationDelay: `${-(seed % 5) * 100}ms` } : null),
            };
          }

          let fill: string;
          if (highlightSubgroups) {
            // Exercise hover: light exactly the muscles that exercise works.
            fill = highlightSubgroups.has(subgroup)
              ? colorOf(subgroup)
              : HOVER_OTHER;
          } else if (selectedGroup) {
            // Selection mode: the selected muscle glows in colour (and pulses);
            // hovering any other muscle lights it in its colour too (no pulse);
            // the rest of the selected group stays grey and other groups recede.
            if (selected || hoveredThis) {
              fill = colorOf(subgroup);
            } else if (SUBGROUP_TO_GROUP[subgroup] === selectedGroup) {
              fill = SIBLING; // same group as the selection
            } else {
              fill = HOVER_OTHER; // other groups recede (filled, not transparent)
            }
          } else if (highlightAll) {
            // Overall-bar hover: light every muscle in its own status colour.
            fill = colorOf(subgroup);
          } else if (highlightGroup) {
            // Group-bar hover: light every subgroup of that group in its own
            // status colour; everything else recedes.
            fill =
              SUBGROUP_TO_GROUP[subgroup] === highlightGroup
                ? colorOf(subgroup)
                : HOVER_OTHER;
          } else if (hovered) {
            // Overview hover: the hovered muscle lights in its colour; rest recede.
            fill = hoveredThis ? colorOf(subgroup) : HOVER_OTHER;
          } else {
            fill = OVERVIEW_MUSCLE; // plain overview
          }
          return (
            <path
              key={i}
              d={p.d}
              fill={fill}
              stroke={SILHOUETTE}
              strokeWidth={0.75}
              vectorEffect="non-scaling-stroke"
              className={
                "cursor-pointer transition-[fill]" +
                (selected || highlightSubgroups?.has(subgroup)
                  ? " gym-muscle-pulse"
                  : "") +
                (searching ? " gym-muscle-flash" : "") +
                (introPhase === "blink" ? " gym-muscle-blink" : "")
              }
              style={introStyle}
              onClick={() => onSelect(subgroup)}
              onMouseEnter={() => onHover({ subgroup, side })}
            >
              <title>{MUSCLE_SUBGROUP_LABELS[subgroup]}</title>
            </path>
          );
        })}
      </svg>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function BodyMap({
  subStandings,
  selectedSubgroup,
  highlightGroup = null,
  highlightAll = false,
  highlightSubgroups = null,
  onSelect,
  onGroupHover,
  onReveal,
}: {
  subStandings: Record<MuscleSubgroup, LiftStanding>;
  selectedSubgroup: MuscleSubgroup | null;
  /** When set (overview only), all subgroups of this group light up in colour. */
  highlightGroup?: MuscleGroup | null;
  /** When true (overview only), every muscle lights up in its own colour. */
  highlightAll?: boolean;
  /** When set, exactly these subgroups light up (e.g. an exercise's muscles). */
  highlightSubgroups?: Set<MuscleSubgroup> | null;
  onSelect: (subgroup: MuscleSubgroup) => void;
  /** Hovering a muscle previews its group everywhere (body + card + radial). */
  onGroupHover?: (group: MuscleGroup | null) => void;
  /**
   * Fires once when the intro reaches its "blink" beat (every part has locked
   * to its real colour) — or immediately if the intro is skipped (reduced
   * motion). The parent uses this to start the staggered strength-bar count-up,
   * so the body animation plays first and the stats follow on the pause.
   */
  onReveal?: () => void;
}) {
  const [hovered, setHovered] = useState<Hover>(null);
  // Hovering a muscle sets local hover state and previews its group everywhere.
  const handleHover = (h: Hover) => {
    setHovered(h);
    onGroupHover?.(h ? SUBGROUP_TO_GROUP[h.subgroup] : null);
  };

  // Play the load-in intro once, the first time real scores are available.
  const [introPhase, setIntroPhase] = useState<IntroPhase>(null);
  const [flashTick, setFlashTick] = useState(0);
  // How many parts have locked in during the search phase. The locked set is the
  // first `lockedCount` subgroups of a randomly-shuffled order.
  const [lockedCount, setLockedCount] = useState(0);
  const lockOrderRef = useRef<MuscleSubgroup[]>([]);
  const lockedSubgroups = useMemo(
    () => new Set(lockOrderRef.current.slice(0, lockedCount)),
    [lockedCount]
  );
  // Keep a live ref so the phase machine (keyed only on introPhase) always calls
  // the latest callback without re-running its timers.
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  // Whether real scores exist yet (gates the intro). A plain boolean dep so the
  // intro fires exactly once it's true — and re-fires cleanly on a remount (e.g.
  // navigating away and back), with the timer cleaned up either way.
  const hasScores = Object.values(subStandings).some(
    (s) => s && s !== "untrained"
  );
  useEffect(() => {
    if (!hasScores) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onRevealRef.current?.(); // no intro → reveal stats now
      return;
    }
    // The multicolour search starts immediately — it fades in alongside the
    // bodies (the figure-entrance fade carries it up from 0 opacity).
    setIntroPhase("search");
  }, [hasScores]);
  // Drive the phase machine. Each effect is keyed only on `introPhase`, so later
  // data loads can't cancel the timers and leave the intro stuck (which would
  // freeze the fill and kill hovers).
  useEffect(() => {
    if (introPhase === "search") {
      // Random order in which the parts "find" their colour.
      const order = [...MUSCLE_SUBGROUPS];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
      lockOrderRef.current = order;
      setLockedCount(0);

      const flash = setInterval(
        () => setFlashTick((t) => t + 1),
        INTRO_FLASH_INTERVAL_MS
      );
      // Flash everything for a beat first, then start locking parts in one by one.
      let lock: ReturnType<typeof setInterval> | undefined;
      const lockStart = setTimeout(() => {
        let n = 0;
        lock = setInterval(() => {
          n += 1;
          setLockedCount(n);
          if (n >= order.length) clearInterval(lock);
        }, SEARCH_STAGGER_MS);
      }, SEARCH_FLASH_LEAD_MS);
      const next = setTimeout(
        () => setIntroPhase("blink"),
        SEARCH_FLASH_LEAD_MS + order.length * SEARCH_STAGGER_MS + SEARCH_END_HOLD_MS
      );
      return () => {
        clearInterval(flash);
        clearTimeout(lockStart);
        clearInterval(lock);
        clearTimeout(next);
      };
    }
    if (introPhase === "blink") {
      // Cue the strength bars only once the blinking has finished and the body
      // is holding solid — the stat rows come in during the solid hold.
      const cue = setTimeout(() => onRevealRef.current?.(), BLINK_ANIM_MS);
      const next = setTimeout(() => setIntroPhase("fade"), INTRO_BLINK_MS);
      return () => {
        clearTimeout(cue);
        clearTimeout(next);
      };
    }
    if (introPhase === "fade") {
      const next = setTimeout(() => setIntroPhase(null), INTRO_FADE_MS);
      return () => clearTimeout(next);
    }
  }, [introPhase]);

  return (
    <div className="mx-auto flex w-full items-start justify-center gap-2">
      <style>{`
        @keyframes gym-muscle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .gym-muscle-pulse { animation: gym-muscle-pulse 1.6s ease-in-out infinite; }
        @keyframes gym-muscle-flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .gym-muscle-flash { animation: gym-muscle-flash 0.5s ease-in-out infinite; }
        @keyframes gym-muscle-blink {
          /* 2 fast blinks */
          0%   { opacity: 1; }
          7%   { opacity: 0.1; }
          14%  { opacity: 1; }
          21%  { opacity: 0.1; }
          28%  { opacity: 1; }
          /* 1 slower blink */
          52%  { opacity: 0.15; }
          80%  { opacity: 1; }
          /* solid */
          100% { opacity: 1; }
        }
        .gym-muscle-blink { animation: gym-muscle-blink 0.9s ease-out both; }
        @keyframes gym-figure-down {
          from { opacity: 0; transform: translateY(-28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gym-figure-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gym-muscle-pulse, .gym-muscle-flash, .gym-muscle-blink { animation: none; }
          /* inline figure entrance — override with !important */
          [style*="gym-figure-"] { animation: none !important; }
        }
      `}</style>
      <Figure
        paths={BODY_FRONT_PATHS}
        viewBox={FRONT_VIEWBOX}
        label="Front"
        side="front"
        subStandings={subStandings}
        selectedSubgroup={selectedSubgroup}
        highlightGroup={highlightGroup}
        highlightAll={highlightAll}
        highlightSubgroups={highlightSubgroups}
        introPhase={introPhase}
        flashTick={flashTick}
        lockedSubgroups={lockedSubgroups}
        enterAnim="down"
        enterDelayMs={0}
        hovered={hovered}
        onSelect={onSelect}
        onHover={handleHover}
      />
      <Figure
        paths={BODY_BACK_PATHS}
        viewBox={BACK_VIEWBOX}
        label="Back"
        side="back"
        subStandings={subStandings}
        selectedSubgroup={selectedSubgroup}
        highlightGroup={highlightGroup}
        highlightAll={highlightAll}
        highlightSubgroups={highlightSubgroups}
        introPhase={introPhase}
        flashTick={flashTick}
        lockedSubgroups={lockedSubgroups}
        enterAnim="up"
        enterDelayMs={0}
        hovered={hovered}
        onSelect={onSelect}
        onHover={handleHover}
      />
    </div>
  );
}
