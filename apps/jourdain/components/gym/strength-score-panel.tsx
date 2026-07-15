"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";
import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_SUBGROUP_LABELS,
  SUBGROUP_TO_GROUP,
  type MuscleGroup,
  type MuscleSubgroup,
} from "@/entities/gym/model/types";
import { STRENGTH_LEVEL_META } from "@/lib/gym/standards";
import { type MuscleRating } from "@/lib/gym/strength-rating";

// Leetify-style strength scorecard: each muscle group as an animated bar scored
// out of 100, where 100 = elite. Scores come straight from the 0–5 continuous
// muscle rating (untrained 0 … elite 5), rescaled ×20 so the band thresholds
// land on tidy numbers (beginner 20, novice 40, … elite 100). Bars are tinted
// by the group's current band colour, matching the body-map legend.
//
// Selecting a muscle floats its parent group to the top and expands that group's
// subgroup scores underneath it; everything reflows with framer-motion layout
// animations, and the subgroup list animates in/out via AnimatePresence.

const DURATION = 2000; // ms — sweep + count-up run off the same rAF, locked together
const STAGGER = 150; // ms between successive bars starting

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** 0–5 muscle score → 0–100 (elite = 100); null/unrated → 0. */
function toScore100(score: number | null): number {
  if (score == null) return 0;
  return Math.round((score / 5) * 100);
}

/** Drives a value 0 → target over DURATION after delayMs, once `ready`. */
function useCountUp(target: number, delayMs: number, ready: boolean): number {
  const [val, setVal] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!ready) {
      setVal(0);
      return;
    }
    let raf = 0;
    startRef.current = 0;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / DURATION);
      setVal(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, delayMs, ready]);

  return val;
}

function ScoreBar({
  label,
  sublabel,
  score,
  color,
  delay,
  ready,
  highlighted = false,
  size = "md",
  onClick,
}: {
  label: string;
  sublabel: string;
  score: number;
  color: string;
  delay: number;
  ready: boolean;
  highlighted?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const val = useCountUp(score, delay, ready);

  const numberClass =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const barClass = size === "lg" ? "h-2.5" : size === "sm" ? "h-1" : "h-1.5";

  const content = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              "truncate font-medium",
              size === "sm" ? "text-xs text-foreground/90" : "text-sm text-muted-foreground",
            )}
          >
            {label}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {sublabel}
          </span>
        </div>
        <span
          className={cn("font-bold tabular-nums", numberClass)}
          style={{ color }}
        >
          {Math.round(val)}
        </span>
      </div>
      <Progress
        value={val}
        max={100}
        className={barClass}
        indicatorStyle={{ backgroundColor: color, transition: "none" }}
      />
    </>
  );

  const className = cn(
    "block w-full rounded-md px-2 py-1 text-left transition-colors",
    highlighted && "bg-muted/60",
    onClick && "hover:bg-muted/40",
  );

  // Each bar fades + lifts into place on the same staggered delay as its
  // count-up, so the whole panel reveals top-to-bottom once `ready` flips.
  const revealStyle: CSSProperties = {
    opacity: ready ? 1 : 0,
    transform: ready ? "translateY(0)" : "translateY(8px)",
    transition: "opacity 700ms ease-out, transform 700ms ease-out",
    transitionDelay: ready ? `${delay}ms` : "0ms",
  };

  return onClick ? (
    <button type="button" onClick={onClick} className={className} style={revealStyle}>
      {content}
    </button>
  ) : (
    <div className={className} style={revealStyle}>{content}</div>
  );
}

export function StrengthScorePanel({
  byGroup,
  bySubgroup,
  selectedGroup,
  selectedSubgroup,
  onSelectGroup,
  onSelectSubgroup,
  onGroupHover,
  hoveredGroup = null,
  highlightGroups = null,
  focusSubgroups = null,
  dataReady = true,
}: {
  byGroup: Record<MuscleGroup, MuscleRating>;
  bySubgroup: Record<MuscleSubgroup, MuscleRating>;
  /** The selected group (floats to top + expands its subgroups). */
  selectedGroup: MuscleGroup | null;
  /** The selected subgroup within the group (highlighted), if drilled in. */
  selectedSubgroup: MuscleSubgroup | null;
  /** Toggle a whole group's selection. */
  onSelectGroup: (group: MuscleGroup) => void;
  /** Toggle a subgroup's selection within the open group. */
  onSelectSubgroup: (subgroup: MuscleSubgroup) => void;
  /** Hovering a group bar (overview only) previews it on the body map. */
  onGroupHover?: (group: MuscleGroup | null) => void;
  /** Currently-hovered group (from here or the radial) — dims the other bars. */
  hoveredGroup?: MuscleGroup | null;
  /** When set (e.g. an exercise is hovered), only these groups stay lit. */
  highlightGroups?: Set<MuscleGroup> | null;
  /** The exact muscles the centred carousel exercise works. When set, the panel
   *  floats those groups to the top and expands just these subgroups under each
   *  (e.g. Back → Lats, Arms → Biceps), taking precedence over a selection. */
  focusSubgroups?: Set<MuscleSubgroup> | null;
  dataReady?: boolean;
}) {
  // The card mounts only once it's ready, so flip an internal flag on the next
  // frame to drive the staggered row entrance (opacity/lift + count-up).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const ready = dataReady && entered;

  // Focus mode: while the carousel is panned, the centred exercise's muscles
  // drive the panel — its groups float up, each expanded to just the subgroups
  // it works (e.g. Back → Lats, Arms → Biceps). This takes precedence over a
  // standing selection; selecting/deselecting clears the focus (the parent
  // stops reporting it) so we fall back to the plain selection / overview.
  const focusing = !!focusSubgroups && focusSubgroups.size > 0;
  const focusGroups = focusing
    ? new Set([...focusSubgroups].map((s) => SUBGROUP_TO_GROUP[s]))
    : null;
  const activeGroup = focusing ? null : selectedGroup;

  // Targeted (focus) or selected group(s) float to the top; the rest keep order.
  const orderedGroups = focusGroups
    ? [
        ...MUSCLE_GROUPS.filter((g) => focusGroups.has(g)),
        ...MUSCLE_GROUPS.filter((g) => !focusGroups.has(g)),
      ]
    : activeGroup
      ? [activeGroup, ...MUSCLE_GROUPS.filter((g) => g !== activeGroup)]
      : [...MUSCLE_GROUPS];

  // Focus and selection both collapse the list to only the groups in play (the
  // exercise's targeted groups, or the one selected group); the rest animate
  // out. The overview keeps every group on screen.
  const visibleGroups = focusGroups
    ? orderedGroups.filter((g) => focusGroups.has(g))
    : activeGroup
      ? orderedGroups.filter((g) => g === activeGroup)
      : orderedGroups;

  // Stable per-group / per-subgroup stagger so reordering never re-triggers a
  // bar's count-up (the delay must not change when display order changes).
  const groupDelay = (g: MuscleGroup) => MUSCLE_GROUPS.indexOf(g) * STAGGER;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2">
        <AnimatePresence initial={false}>
        {visibleGroups.map((g) => {
          const r = byGroup[g];
          const inFocus = focusGroups?.has(g) ?? false;
          const isActive = activeGroup === g;
          // Subgroups to expand: the exercise's targeted ones in focus mode, or
          // all of them when the group is explicitly selected.
          const subs = inFocus
            ? GROUP_SUBGROUPS[g].filter((s) => focusSubgroups?.has(s))
            : isActive
              ? GROUP_SUBGROUPS[g]
              : [];
          const dimmed =
            (!!hoveredGroup && g !== hoveredGroup) ||
            (!!highlightGroups && !highlightGroups.has(g));
          return (
            <motion.div
              key={g}
              layout="position"
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: dimmed ? 0.35 : 1,
                height: "auto",
              }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
              onMouseEnter={() => onGroupHover?.(g)}
              onMouseLeave={() => onGroupHover?.(null)}
            >
              <ScoreBar
                label={MUSCLE_GROUP_LABELS[g]}
                sublabel={STRENGTH_LEVEL_META[r.standing].label}
                score={toScore100(r.score)}
                color={STRENGTH_LEVEL_META[r.standing].color}
                delay={groupDelay(g)}
                ready={ready}
                highlighted={inFocus || isActive}
                onClick={() => onSelectGroup(g)}
              />

              <AnimatePresence initial={false}>
                {subs.length > 0 && (
                  <motion.div
                    key="subs"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 mt-1 space-y-1 border-l border-border pl-3">
                      {subs.map((sub, j) => {
                        const sr = bySubgroup[sub];
                        const selected = inFocus || selectedSubgroup === sub;
                        return (
                          <ScoreBar
                            key={sub}
                            label={MUSCLE_SUBGROUP_LABELS[sub]}
                            sublabel={STRENGTH_LEVEL_META[sr.standing].label}
                            score={toScore100(sr.score)}
                            color={STRENGTH_LEVEL_META[sr.standing].color}
                            delay={120 + j * 60}
                            ready={ready}
                            highlighted={selected}
                            size="sm"
                            onClick={() => onSelectSubgroup(sub)}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
}
