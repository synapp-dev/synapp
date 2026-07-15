import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import type { WeatherIconKind } from "@/entities/weather/lib/weather-icon-kind";

/**
 * CSS-animated weather glyph drawn in a 24x24 box.
 * `WeatherGlyphShape` is a bare <g> so it can live inside another SVG (Recharts
 * layers); `WeatherGlyphIcon` wraps it in an <svg> for normal DOM use.
 * Colours are Tailwind fill classes tuned for the emerald hero card in both themes.
 */

const SUN_CORE = "fill-amber-300 dark:fill-amber-500";
const CLOUD = "fill-white/80 dark:fill-slate-500/70";
const CLOUD_BACK = "fill-white/50 dark:fill-slate-400/50";
const DROP = "fill-sky-300 dark:fill-sky-500";
const BOLT = "fill-amber-300 dark:fill-amber-500";
const FLAKE = "fill-white/90 dark:fill-slate-400";

function SunRays({ className }: { className?: string }) {
  return (
    <g className={cn("weather-glyph-sun", className)}>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 12 + Math.cos(angle) * 7;
        const y1 = 12 + Math.sin(angle) * 7;
        const x2 = 12 + Math.cos(angle) * 9.5;
        const y2 = 12 + Math.sin(angle) * 9.5;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth={1.8}
            strokeLinecap="round"
            className="stroke-amber-300 dark:stroke-amber-500"
          />
        );
      })}
    </g>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <path
      d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
      className={cn("weather-glyph-cloud", CLOUD, className)}
    />
  );
}

function Drops({ count }: { count: 2 | 3 }) {
  const xs = count === 2 ? [9.5, 14.5] : [8.5, 12, 15.5];
  const delays = ["", "weather-glyph-drop-b", "weather-glyph-drop-c"];
  return (
    <g>
      {xs.map((x, i) => (
        <rect
          key={x}
          x={x - 0.8}
          y={19.6}
          width={1.6}
          height={3}
          rx={0.8}
          className={cn("weather-glyph-drop", delays[i], DROP)}
        />
      ))}
    </g>
  );
}

export function WeatherGlyphShape({ kind }: { kind: WeatherIconKind }) {
  switch (kind) {
    case "sun":
      return (
        <g>
          <SunRays />
          <circle cx={12} cy={12} r={4.6} className={SUN_CORE} />
        </g>
      );
    case "partly_cloudy":
      return (
        <g>
          <g className="weather-glyph-sun">
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * Math.PI) / 4;
              return (
                <line
                  key={i}
                  x1={9 + Math.cos(angle) * 4.6}
                  y1={8.5 + Math.sin(angle) * 4.6}
                  x2={9 + Math.cos(angle) * 6.4}
                  y2={8.5 + Math.sin(angle) * 6.4}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="stroke-amber-300 dark:stroke-amber-500"
                />
              );
            })}
            <circle cx={9} cy={8.5} r={3.1} className={SUN_CORE} />
          </g>
          <path
            d="M18 20h-7.4a4.6 4.6 0 1 1 1.06-9.08A5.4 5.4 0 0 1 18 11.5a4.25 4.25 0 1 1 0 8.5Z"
            className={cn("weather-glyph-cloud", CLOUD)}
          />
        </g>
      );
    case "cloudy":
      return (
        <g>
          <path
            d="M19 13.5h-5a4 4 0 1 1 3.83-5.14A3.4 3.4 0 1 1 19 13.5Z"
            className={CLOUD_BACK}
          />
          <Cloud className="translate-y-[2px]" />
        </g>
      );
    case "fog":
      return (
        <g>
          <path
            d="M17.5 15H9a5.6 5.6 0 1 1 5.37-7.2h3.13a3.6 3.6 0 1 1 0 7.2Z"
            className={CLOUD}
          />
          <rect x={6} y={17.4} width={12} height={1.5} rx={0.75} className={cn("weather-glyph-fog-line", CLOUD_BACK)} />
          <rect x={8} y={20.2} width={9} height={1.5} rx={0.75} className={cn("weather-glyph-fog-line", "weather-glyph-fog-line-b", CLOUD_BACK)} />
        </g>
      );
    case "drizzle":
      return (
        <g>
          <Cloud />
          <Drops count={2} />
        </g>
      );
    case "rain":
      return (
        <g>
          <Cloud />
          <Drops count={3} />
        </g>
      );
    case "storm":
      return (
        <g>
          <Cloud />
          <path
            d="M13.2 12.8 9.6 17.6h2.3L10.6 21.6l4.6-5.6h-2.5l2-3.2Z"
            className={cn("weather-glyph-bolt", BOLT)}
          />
        </g>
      );
    case "snow":
      return (
        <g>
          <Cloud />
          <circle cx={9} cy={20.6} r={1.05} className={cn("weather-glyph-flake", FLAKE)} />
          <circle cx={12.5} cy={21.4} r={1.05} className={cn("weather-glyph-flake", FLAKE)} style={{ animationDelay: "0.9s" }} />
          <circle cx={16} cy={20.6} r={1.05} className={cn("weather-glyph-flake", FLAKE)} style={{ animationDelay: "1.7s" }} />
        </g>
      );
    default: {
      const never: never = kind;
      return never;
    }
  }
}

export function WeatherGlyphIcon({
  kind,
  size = 16,
  className,
  title,
}: {
  kind: WeatherIconKind;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <WeatherGlyphShape kind={kind} />
    </svg>
  );
}
