"use client";

import { useState } from "react";
import { SupersoltMarkDraw } from "@/components/branding/supersolt-mark-draw";
import { SupersoltSpinner } from "@/components/branding/supersolt-spinner";
import {
  SPLASH_EXIT_MS,
  SupersoltSplash,
  SupersoltWordmarkDraw,
} from "@/components/branding/supersolt-splash";
import {
  SkeletonReveal,
  SkeletonRevealGroup,
} from "@/lib/ui/skeleton-reveal";

/**
 * Showcase for the Supersolt 3D spinning logo — dev-only route (not in the
 * auth middleware matcher, not linked from the app).
 */
export default function SpinnerDemoPage() {
  const [drawKey, setDrawKey] = useState(0);
  const [wmKey, setWmKey] = useState(0);
  const [splashState, setSplashState] = useState<"off" | "in" | "exiting">(
    "off",
  );
  const playSplash = () => {
    if (splashState !== "off") return;
    setSplashState("in");
    window.setTimeout(() => setSplashState("exiting"), 3400);
    window.setTimeout(() => setSplashState("off"), 3400 + SPLASH_EXIT_MS);
  };

  return (
    <main className="dark min-h-screen bg-background p-10 text-foreground">
      <h1 className="mb-8 text-lg font-semibold">Supersolt 3D logo</h1>

      <SkeletonRevealSection />


      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Splash</h2>
        <button
          type="button"
          data-testid="play-splash"
          onClick={playSplash}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Play splash (in + out)
        </button>
        <button
          type="button"
          onClick={() => setWmKey((k) => k + 1)}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Replay wordmark
        </button>
      </div>
      {splashState !== "off" && (
        <SupersoltSplash exiting={splashState === "exiting"} />
      )}
      <div className="mb-10 w-fit rounded-xl border bg-card p-6">
        <SupersoltWordmarkDraw key={wmKey} className="w-[360px]" />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Draw-in entrance
        </h2>
        <button
          type="button"
          data-testid="replay"
          onClick={() => setDrawKey((k) => k + 1)}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Replay
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <Cell label="tile · 240 · drawIn">
          <SupersoltSpinner
            key={`tile-${drawKey}`}
            variant="tile"
            size={240}
            drawIn
          />
        </Cell>
        <Cell label="mark · 240 · drawIn">
          <SupersoltSpinner
            key={`mark-${drawKey}`}
            variant="mark"
            size={240}
            drawIn
          />
        </Cell>
      </div>

      <h2 className="mb-4 mt-10 text-sm font-medium text-muted-foreground">
        Variants
      </h2>
      <div className="flex flex-wrap items-start gap-8">
        <Cell label="tile · 240">
          <SupersoltSpinner variant="tile" size={240} />
        </Cell>
        <Cell label="mark · 240">
          <SupersoltSpinner variant="mark" size={240} />
        </Cell>
        <Cell label="mark · 240 · stroked">
          <SupersoltSpinner
            variant="mark"
            size={240}
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        </Cell>
        <Cell label="mark · 240 · wireframe">
          <SupersoltSpinner
            variant="mark"
            size={240}
            faceColor="background"
            strokeColor="#bcdb8b"
            strokeOpacity={0.9}
            strokeWidth={2}
          />
        </Cell>
        <Cell label="mark · 240 · ghost">
          <SupersoltSpinner
            variant="mark"
            size={240}
            faceColor="transparent"
            strokeColor="#bcdb8b"
            strokeOpacity={0.9}
            strokeWidth={2}
          />
        </Cell>
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-8">
        <Cell label="spinner · 96">
          <SupersoltSpinner size={96} />
        </Cell>
        <Cell label="spinner · 48">
          <SupersoltSpinner size={48} speed={0.5} />
        </Cell>
        <Cell label="tile · 96">
          <SupersoltSpinner variant="tile" size={96} />
        </Cell>
        <div className="rounded-xl bg-white p-6">
          <SupersoltSpinner variant="tile" size={120} />
        </div>
      </div>
    </main>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border bg-card p-4">{children}</div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

const DEMO_CARDS = [
  { label: "Net revenue", value: "$18,204" },
  { label: "Orders", value: "1,142" },
  { label: "Avg order", value: "$15.94" },
  { label: "COGS", value: "$6,081" },
  { label: "Stock at risk", value: "3 items" },
  { label: "Untracked sales", value: "$412" },
];

function SkeletonRevealSection() {
  // `loading` per card so we can resolve them one at a time and watch each
  // card's own reverse draw-out fire independently.
  const [loaded, setLoaded] = useState<boolean[]>(() =>
    DEMO_CARDS.map(() => false),
  );
  const [runKey, setRunKey] = useState(0);

  // Slow load: each card stays loading long enough for the spinning mark to
  // appear, then resolves a beat apart so their reverse draw-outs fire per card.
  const startSlow = () => {
    setLoaded(DEMO_CARDS.map(() => false));
    setRunKey((k) => k + 1);
    DEMO_CARDS.forEach((_, i) => {
      window.setTimeout(
        () => setLoaded((prev) => prev.map((v, j) => (j === i ? true : v))),
        2600 + i * 650,
      );
    });
  };

  // Fast/instant load: data resolves before the mark would appear, so each card
  // only traces its outline on then off — no symbol, no whole-card slide.
  const startFast = () => {
    setLoaded(DEMO_CARDS.map(() => false));
    setRunKey((k) => k + 1);
    window.setTimeout(() => setLoaded(DEMO_CARDS.map(() => true)), 250);
  };

  return (
    <section className="mb-14">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Skeleton reveal
        </h2>
        <button
          type="button"
          data-testid="play-skeleton"
          onClick={startSlow}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Play slow load (outline → mark → reverse)
        </button>
        <button
          type="button"
          data-testid="play-skeleton-fast"
          onClick={startFast}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Play instant load (outline only)
        </button>
      </div>
      <div key={runKey} className="grid max-w-3xl grid-cols-3 gap-4">
        <SkeletonRevealGroup>
          {DEMO_CARDS.map((card, i) => (
            <SkeletonReveal key={card.label} loading={!loaded[i]} radius={12}>
              <div className="flex min-h-24 flex-col justify-between gap-3 rounded-xl border bg-card px-5 py-4">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {card.value}
                </span>
              </div>
            </SkeletonReveal>
          ))}
        </SkeletonRevealGroup>
      </div>

      <h2 className="mb-4 mt-10 text-sm font-medium text-muted-foreground">
        2D mark draw (SVG, no WebGL)
      </h2>
      <div className="flex flex-wrap items-start gap-8">
        <Cell label="mark · 96">
          <SupersoltMarkDraw key={`m-${runKey}`} size={96} />
        </Cell>
      </div>
    </section>
  );
}
