import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

interface AnimatedStatProps {
  label: string;
  value: number;
  colorClass: string;
  progressMax: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  progressTransform?: (value: number) => number;
  duration?: number; // seconds
  dataReady?: boolean; // new prop
  delay?: number; // seconds, optional
  loadingLabel?: string;
  showPlusSign?: boolean; // new prop
}

// Ease-in-out with a SHORT ease-in (quick to accelerate) and a long, soft
// deceleration into the final value. The first control point's x (0.42) sets
// how long the slow start lasts — lower = sooner acceleration; the second point
// (0.17, 1) keeps the gentle finish. The bar (CSS transition) and the count-up
// number both read these same control points so they stay in lockstep.
const EASE_CONTROL_POINTS = [0.42, 0, 0.17, 1] as const;
const EASE_IN_OUT = `cubic-bezier(${EASE_CONTROL_POINTS.join(", ")})`;

/** Evaluate a cubic-bezier easing y for a normalized progress x in [0, 1]. */
function makeBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton-Raphson to solve sampleX(t) = x, then read sampleY(t).
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      if (Math.abs(xEst) < 1e-5) return sampleY(t);
      const deriv = sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;
      t -= xEst / deriv;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

const bezierEase = makeBezierEase(...EASE_CONTROL_POINTS);

/** react-countup easing signature: matches the bar's cubic-bezier curve. */
function easeInOut(t: number, b: number, c: number, d: number): number {
  return b + c * bezierEase(d === 0 ? 1 : t / d);
}

export function AnimatedStat({
  label,
  value,
  colorClass,
  progressMax,
  decimals = 1,
  prefix = "",
  suffix = "",
  progressTransform,
  duration = 4, // default to 4 seconds
  dataReady = true,
  delay = 0, // default to no delay
  loadingLabel = "Loading...",
  showPlusSign = false, // default false
}: AnimatedStatProps) {
  const [progress, setProgress] = useState(0);

  // Calculate the final target value for the progress bar
  const target = progressTransform
    ? progressTransform(dataReady ? value : 0)
    : dataReady
      ? value
      : 0;

  // Drive the bar with a single CSS transition rather than per-frame stepping:
  // hold at 0, then (after the delay) flip to the target so the browser tweens
  // the whole sweep with the ease-in-out curve below.
  useEffect(() => {
    setProgress(0);
    let raf1 = 0;
    let raf2 = 0;
    const timeoutId = setTimeout(() => {
      // Two rAFs so the 0 state paints before the transition to target begins.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setProgress(target));
      });
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [target, delay]);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm text-muted-foreground font-medium",
            !dataReady
              ? "text-muted animate-pulse"
              : "animate-slide-down-fade-in-slowest"
          )}
        >
          {dataReady ? label : loadingLabel}
        </span>
        <span className={`text-2xl font-bold`}>
          {/* {value > 85 && <FireExtinguisher className="w-4 h-4" />} */}
          {dataReady ? (
            <CountUp
              start={0}
              end={value}
              duration={duration}
              delay={delay}
              useEasing
              easingFn={easeInOut}
              decimals={decimals}
              prefix={showPlusSign && value > 0 ? "+" : ""}
              style={{
                color: value > 85 ? "orange" : "var(--primary)",
              }}
              className={cn(value > 85 && "animate-pulse")}
            />
          ) : (
            <span className="text-muted animate-pulse">
              {showPlusSign && 0 > 0 ? "+" : ""}0{suffix}
            </span>
          )}
        </span>
      </div>
      <Progress
        value={dataReady ? progress : 0}
        max={progressMax}
        className={cn(
          "h-2",
          value > 85 && "animate-pulse",
          !dataReady ? "opacity-60 animate-pulse" : ""
        )}
        indicatorStyle={{
          backgroundColor: value > 85 ? "orange" : "var(--primary)",
          transition: dataReady
            ? `transform ${duration}s ${EASE_IN_OUT}`
            : "none",
        }}
      />
    </div>
  );
}
