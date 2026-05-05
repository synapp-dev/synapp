import { cn } from "@workspace/ui/lib/utils";
import CountUp from "react-countup";

function getRankColor(rank: number) {
  if (rank >= 30000) return "#f0ae34";
  if (rank >= 25000) return "#ff6060";
  if (rank >= 20000) return "#fa51fc";
  if (rank >= 15000) return "#b363ee";
  if (rank >= 10000) return "#6c7ccb";
  if (rank >= 5000) return "#88b9e8";
  if (rank <= 4999) return "#b3c4d8";
  return "#de43e8";
}

function hexToRgba(hex: string, alpha: number) {
  // Remove '#' if present
  hex = hex.replace(/^#/, "");
  // Parse r, g, b
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function PremierEloBadge({
  rank,
  size = "lg",
}: {
  rank: number;
  size?: "lg" | "normal" | "sm" | "xs";
}) {
  const rankColor = getRankColor(rank);

  // Map size prop to Tailwind font size classes
  const sizeClass =
    {
      lg: "text-3xl",
      normal: "text-xl",
      sm: "text-sm",
      xs: "text-xs",
    }[size] || "text-3xl";

  return (
    <div
      className={`relative font-stratum tracking-tighter italic font-extrabold text-center ${sizeClass}`}
    >
      <div
        className={cn(
          "-skew-x-12 h-full w-1.5 absolute -left-0 z-0",
          size === "xs" && "w-1 -left-1",
          size === "sm" && "w-1 -left-0.5",
        )}
        style={{
          backgroundColor: rankColor,
        }}
      />
      <div
        className={cn(
          "-skew-x-12 h-full w-1.5 absolute -left-2 z-0",
          size === "xs" && "w-1",
          size === "sm" && "w-1 -left-2",
        )}
        style={{ backgroundColor: rankColor }}
      />
      <div
        className={cn(
          "-skew-x-12 bg-gradient-to-r h-full w-full absolute mr-4 -left-2 z-0",
          size === "xs" && "mr-0 -left-1",
          size === "sm" && "mr-0",
        )}
        style={{
          background: `linear-gradient(to right, ${hexToRgba(rankColor, 0.3)}, ${hexToRgba(rankColor, 0.2)}, ${hexToRgba(rankColor, 0.05)})`,
          border: `1px solid ${hexToRgba(rankColor, 0.25)}`,
        }}
      />

      <div
        className={cn(
          "relative z-20 mb-0.5 pl-3 pr-1 py-0.5",
          size === "sm" && "pl-2 pr-0.5 py-0.5",
        )}
      >
        <CountUp
          start={0}
          end={rank || 0}
          duration={2}
          useEasing={true}
          separator=","
          decimals={0}
          className="mr-4"
          style={{ color: rankColor }}
        />
      </div>
    </div>
  );
}
