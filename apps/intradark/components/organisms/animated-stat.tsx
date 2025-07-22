import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";
import { FireExtinguisher } from "lucide-react";

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
}

// Easing function: easeInOutCubic
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  duration = 5, // default to 5 seconds
  dataReady = true,
  delay = 0, // default to no delay
  loadingLabel = "Loading...",
}: AnimatedStatProps) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  // Calculate the final target value for the progress bar
  const target = progressTransform
    ? progressTransform(dataReady ? value : 0)
    : dataReady
      ? value
      : 0;

  useEffect(() => {
    setProgress(0);
    const start = 0;
    const totalSteps = Math.max(1, Math.round(60 * duration)); // 60fps * duration seconds
    let currentStep = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function step() {
      if (cancelled) return;
      currentStep++;
      const linearT = Math.min(1, currentStep / totalSteps);
      const easedT = easeInOutCubic(linearT);
      const nextValue = start + (target - start) * easedT;
      setProgress(nextValue);
      if (currentStep < totalSteps) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setProgress(target); // ensure it ends exactly at target
      }
    }

    // Delay before starting the animation
    timeoutId = setTimeout(() => {
      frameRef.current = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      cancelled = true;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // Only re-run when the final animated value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay]);

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
              decimals={decimals}
              style={{
                color: value > 85 ? "orange" : "var(--primary)",
              }}
              className={cn(value > 85 && "animate-pulse")}
            />
          ) : (
            <span className="text-muted animate-pulse">0{suffix}</span>
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
        }}
      />
    </div>
  );
}
