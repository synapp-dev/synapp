"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@workspace/ui/lib/utils";
import {
  MARK_IN_MS,
  MARK_OUT_MS,
  SupersoltMarkDraw,
} from "@/components/branding/supersolt-mark-draw";
import { useSplashPageIntroHold } from "@/lib/ui/use-splash-page-intro-hold";

/**
 * Branded skeleton loader — the loading-state sibling of {@link
 * StaggeredAnimation}. Wrap a card in <SkeletonReveal loading={...}>. The card
 * itself never slides or fades as a whole — it just sits in place and its own
 * children animate on their own accord. The only "chrome" is the card's border
 * tracing itself on in brand green then, on reveal, the card's REAL border
 * colour tracing over the green in the same direction — one seamless cycle that
 * turns the outline into the actual card border — plus (for slow loads) a
 * spinning "S" mark.
 *
 * Two paths, chosen by how fast the data arrives:
 *
 *   FAST (data already there, or it resolves before the mark would appear):
 *   the green outline traces on, then the card's border colour writes over it
 *   as the card is revealed underneath. No symbol, no whole-card fade — the
 *   outline cycle is the whole flourish, and the children animate themselves in.
 *
 *   SLOW (still loading once the outline has landed): the spinning mark draws
 *   in over the outline — outline first, then fill — settles facing forward and
 *   idles; when `loading` flips false the mark draws out and the card's border
 *   colour writes over the green, revealing the ready card underneath.
 *
 * The real children stay mounted (invisible) while loading so the outline
 * matches their footprint to the pixel; on reveal they remount so any of their
 * own entrance animations (count-ups, chart draws) play in view. Drop a
 * <SkeletonRevealGroup> around a set to auto-stagger the outlines top-to-bottom.
 *
 * The mark is the pure-SVG {@link SupersoltMarkDraw}, not the WebGL spinner, so
 * a whole grid of these costs no GPU contexts.
 */

const BRAND_GREEN = "#bcdb8b";
// The real shadcn card border token — what the green outline resolves into.
const CARD_BORDER = "var(--border)";

// Sequencing (ms).
const BORDER_TRACE_MS = 560; // green outline drawing itself on
// On reveal the outline doesn't reverse — the card's real border colour traces
// over the green in the same direction, so the outline seamlessly becomes the
// actual card border.
const BORDER_OVERWRITE_MS = 520;
// On a slow load the reveal runs the mark's draw-out alongside the over-write.
const SLOW_EXIT_MS = Math.max(MARK_OUT_MS, BORDER_OVERWRITE_MS);
// The children's own entrance animations must not START until the skeleton is
// mostly gone — hold their reveal until this fraction of the exit has played,
// so nothing settles while the outline / mark is still visibly there.
const REVEAL_AT_FRACTION = 0.9;

// ---------------------------------------------------------------------------
// Group: auto-stagger index so a set of cards cascades top-to-bottom.
// ---------------------------------------------------------------------------

interface SkeletonGroupValue {
  next: () => number;
  baseDelayMs: number;
  staggerMs: number;
}

const SkeletonGroupContext = createContext<SkeletonGroupValue | null>(null);

export interface SkeletonRevealGroupProps {
  children: React.ReactNode;
  /** Delay before the first card's outline starts, ms. Default 60. */
  baseDelayMs?: number;
  /** Offset between one card's outline starting and the next, ms. Default 90. */
  staggerMs?: number;
}

/**
 * Auto-numbers the {@link SkeletonReveal}s inside it in mount order (top to
 * bottom) so their outlines trace on at a stagger. Purely for ergonomics — you
 * can always pass `index` explicitly instead.
 */
export function SkeletonRevealGroup({
  children,
  baseDelayMs = 60,
  staggerMs = 90,
}: SkeletonRevealGroupProps) {
  // A render-stable counter. Reset at the top of every render so indices stay
  // consistent across re-renders (children register in a fixed order).
  const counterRef = useRef(0);
  counterRef.current = 0;
  const value: SkeletonGroupValue = {
    next: () => counterRef.current++,
    baseDelayMs,
    staggerMs,
  };
  return (
    <SkeletonGroupContext.Provider value={value}>
      {children}
    </SkeletonGroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// SkeletonReveal
// ---------------------------------------------------------------------------

export interface SkeletonRevealProps {
  /** While true, show the placeholder; flip to false to reveal `children`. */
  loading: boolean;
  children: React.ReactNode;
  /**
   * Stagger order (top-to-bottom). Auto-assigned inside a
   * {@link SkeletonRevealGroup}; pass explicitly otherwise. Default 0.
   */
  index?: number;
  /** Delay before this card's outline starts, ms. Overrides index math. */
  delayMs?: number;
  /** Slow-load mark size in px. Default 64. */
  markSize?: number;
  /** Border radius of the traced outline, px. Match your card. Default 12. */
  radius?: number;
  /** Trace / mark accent colour. Default brand green. */
  accent?: string;
  /**
   * The card's real border colour, which traces over the green outline on
   * reveal. Default the shadcn card border token (`var(--border)`); pass a
   * literal when the wrapped card uses a coloured border.
   */
  borderColor?: string;
  /**
   * Keep the placeholder up at least this long after mount before revealing, so
   * a card that resolves mid-draw still finishes its outline cleanly. Default =
   * the outline's own draw time.
   */
  minVisibleMs?: number;
  /**
   * On a first-load splash, wait for the page to reveal before starting the
   * choreography, so the draw-in plays in view rather than unseen behind the
   * splash (mirrors {@link StaggeredAnimation}). Default true.
   */
  holdForSplash?: boolean;
  /** Extra classes on the wrapper (position: relative). */
  className?: string;
}

export function SkeletonReveal({
  loading,
  children,
  index,
  delayMs,
  markSize = 64,
  radius = 12,
  accent = BRAND_GREEN,
  borderColor = CARD_BORDER,
  minVisibleMs,
  holdForSplash = true,
  className,
}: SkeletonRevealProps) {
  const group = useContext(SkeletonGroupContext);
  // Claim a stable index from the group on first render if none was given.
  const claimedIndexRef = useRef<number | null>(null);
  if (claimedIndexRef.current === null) {
    claimedIndexRef.current = index ?? (group ? group.next() : 0);
  }
  const resolvedIndex = index ?? claimedIndexRef.current;

  const baseDelay = group?.baseDelayMs ?? 60;
  const stagger = group?.staggerMs ?? 90;
  const frameDelay = delayMs ?? baseDelay + resolvedIndex * stagger;

  // While the first-load splash still covers the page, hold: keep the box in
  // layout (invisible children for sizing) but run no choreography. When the
  // page reveals, the plain <div> gives way to <SkeletonRevealLive>, which
  // mounts fresh and plays the outline draw in view.
  const held = useSplashPageIntroHold() && holdForSplash;
  if (held) {
    return (
      <div className={cn("relative", className)}>
        <div className="h-full min-h-0 opacity-0" aria-hidden>
          {children}
        </div>
      </div>
    );
  }

  return (
    <SkeletonRevealLive
      loading={loading}
      frameDelay={frameDelay}
      markSize={markSize}
      radius={radius}
      accent={accent}
      borderColor={borderColor}
      minVisibleMs={minVisibleMs}
      className={className}
    >
      {children}
    </SkeletonRevealLive>
  );
}

// outlineIn (green drawing on) → symbol (slow load only) → exit (border colour
// writes over + reveal) → done (overlay gone, card standing).
type Phase = "outlineIn" | "symbol" | "exit" | "done";

interface SkeletonRevealLiveProps {
  loading: boolean;
  children: React.ReactNode;
  frameDelay: number;
  markSize: number;
  radius: number;
  accent: string;
  borderColor: string;
  minVisibleMs?: number;
  className?: string;
}

function SkeletonRevealLive({
  loading,
  children,
  frameDelay,
  markSize,
  radius,
  accent,
  borderColor,
  minVisibleMs,
  className,
}: SkeletonRevealLiveProps) {
  const [phase, setPhase] = useState<Phase>("outlineIn");
  // The children mount/animate only once the skeleton is mostly gone (see the
  // exit effect), NOT at the instant the exit begins.
  const [revealed, setRevealed] = useState(false);
  // Read live inside timers so a loading flip doesn't restart the outline.
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  // Did we ever escalate to the spinning mark? Drives whether the exit draws a
  // mark out and how long the exit lasts.
  const symbolShownRef = useRef(false);
  const symbolStartRef = useRef<number | null>(null);
  const mountedAtRef = useRef<number>(Date.now());

  const minFloor = minVisibleMs ?? BORDER_TRACE_MS;

  // outlineIn → symbol | exit, once the border has finished tracing on. If the
  // data is here by then (fast path) we skip the mark entirely and reveal;
  // otherwise the spinning mark takes over.
  useEffect(() => {
    if (phase !== "outlineIn") return;
    const t = window.setTimeout(() => {
      if (loadingRef.current) {
        symbolShownRef.current = true;
        symbolStartRef.current = Date.now();
        setPhase("symbol");
      } else {
        setPhase("exit");
      }
    }, frameDelay + BORDER_TRACE_MS);
    return () => window.clearTimeout(t);
  }, [phase, frameDelay]);

  // symbol → exit, once loading resolves — but never before the mark has drawn
  // itself fully in (so it reverses from a settled state, not mid-draw).
  useEffect(() => {
    if (phase !== "symbol" || loading) return;
    const markInDone = (symbolStartRef.current ?? Date.now()) + MARK_IN_MS;
    const floor = mountedAtRef.current + minFloor;
    const wait = Math.max(0, Math.max(markInDone, floor) - Date.now());
    const t = window.setTimeout(() => setPhase("exit"), wait);
    return () => window.clearTimeout(t);
  }, [phase, loading, minFloor]);

  // During the exit the outline un-traces (and any mark draws out). We hold the
  // children's reveal until REVEAL_AT_FRACTION of that has played, so their own
  // entrance animations only START once the skeleton is ~90% gone — nothing
  // settles while the outline / mark is still visibly there. Remounting on
  // reveal restarts those animations so they play in view.
  useEffect(() => {
    if (phase !== "exit") return;
    const dur = symbolShownRef.current ? SLOW_EXIT_MS : BORDER_OVERWRITE_MS;
    const revealTimer = window.setTimeout(
      () => setRevealed(true),
      dur * REVEAL_AT_FRACTION,
    );
    const doneTimer = window.setTimeout(() => setPhase("done"), dur);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  const cardVisible = revealed || phase === "done";
  const showOverlay = phase !== "done";
  const exiting = phase === "exit";
  const symbolShown = symbolShownRef.current;

  return (
    <div className={cn("relative", className)}>
      <div
        key={cardVisible ? "reveal" : "pending"}
        // Fill the wrapper so height-stretched cards (grid rows, h-full) can
        // reach the slot's edges; a no-op when the wrapper is content-sized.
        className={cn("h-full min-h-0", cardVisible ? undefined : "opacity-0")}
        aria-hidden={!cardVisible}
      >
        {children}
      </div>

      {showOverlay && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <CardOutlineTrace
            radius={radius}
            accent={accent}
            borderColor={borderColor}
            delayMs={frameDelay}
            exiting={exiting}
          />
          {symbolShown && (
            <SupersoltMarkDraw
              size={markSize}
              color={accent}
              exiting={exiting}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardOutlineTrace — a rounded-rect border that traces itself on in the brand
// green, then, on reveal, has the card's real border colour trace over it in
// the same direction so the outline seamlessly becomes the actual card border.
// ---------------------------------------------------------------------------

const OUTLINE_KEYFRAMES = `
@keyframes ss-outline-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes ss-outline-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.9; } }
@media (prefers-reduced-motion: reduce) {
  .ss-outline-rect { animation-duration: 1ms !important; animation-delay: 0ms !important; }
}
`;

const STROKE_W = 1.5;

/**
 * A rounded-rect outline path, clockwise from the top-left corner, inset by
 * half the stroke so it sits just inside the card edge. We draw a `<path>`
 * (not a `<rect>`) because `pathLength` on basic shapes only landed in Safari
 * 16 — and this ships to iPads.
 */
function roundedRectPath(w: number, h: number, r: number, inset: number) {
  const x = inset;
  const y = inset;
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  const rr = Math.max(0, Math.min(r, iw / 2, ih / 2));
  return [
    `M${x + rr},${y}`,
    `H${x + iw - rr}`,
    `A${rr},${rr} 0 0 1 ${x + iw},${y + rr}`,
    `V${y + ih - rr}`,
    `A${rr},${rr} 0 0 1 ${x + iw - rr},${y + ih}`,
    `H${x + rr}`,
    `A${rr},${rr} 0 0 1 ${x},${y + ih - rr}`,
    `V${y + rr}`,
    `A${rr},${rr} 0 0 1 ${x + rr},${y}`,
    "Z",
  ].join(" ");
}

function CardOutlineTrace({
  radius,
  accent,
  borderColor,
  delayMs,
  exiting,
}: {
  radius: number;
  accent: string;
  borderColor: string;
  delayMs: number;
  exiting: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The green outline traces on, then holds (pulsing) while loading. On exit it
  // just stays put — fully drawn — and the border-colour pass below writes over
  // it rather than reversing.
  const greenAnimation = exiting
    ? "none"
    : `ss-outline-draw ${BORDER_TRACE_MS}ms ease-out ${delayMs}ms both, ss-outline-pulse 2600ms ease-in-out ${delayMs + BORDER_TRACE_MS}ms infinite`;

  const path = box ? roundedRectPath(box.w, box.h, radius, STROKE_W / 2) : null;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden>
      {box && path ? (
        <svg
          className="absolute inset-0"
          width={box.w}
          height={box.h}
          fill="none"
        >
          <style>{OUTLINE_KEYFRAMES}</style>
          <path
            className="ss-outline-rect"
            d={path}
            stroke={accent}
            strokeWidth={STROKE_W}
            strokeOpacity={0.7}
            pathLength={1}
            style={{ strokeDasharray: 1, animation: greenAnimation }}
          />
          {exiting ? (
            // The card's real border colour traces over the green in the same
            // direction — a touch wider so it fully covers it — landing exactly
            // on the real card border revealed underneath.
            <path
              d={path}
              stroke={borderColor}
              strokeWidth={STROKE_W + 0.5}
              pathLength={1}
              style={{
                strokeDasharray: 1,
                animation: `ss-outline-draw ${BORDER_OVERWRITE_MS}ms ease both`,
              }}
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
