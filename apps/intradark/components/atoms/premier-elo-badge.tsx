import CountUp from "react-countup";

function getRankColor(rank: number) {
  if (rank >= 30000) return "#f0ae34";
  if (rank >= 25000) return "#ff6060";
  if (rank >= 20000) return "#fa51fc";
  if (rank >= 15000) return "#b363ee";
  if (rank >= 10000) return "#ff6060";
  if (rank >= 5000) return "#ff6060";
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

export function PremierEloBadge({ rank }: { rank: number }) {
  const rankColor = getRankColor(rank);

  return (
    <div className="relative text-3xl font-stratum tracking-tighter italic font-extrabold text-center">
      <div
        className="-skew-x-12 h-full w-1.5 absolute -left-0 z-0"
        style={{
          backgroundColor: rankColor,
        }}
      />
      <div
        className="-skew-x-12 h-full w-1.5 absolute -left-2 z-0"
        style={{ backgroundColor: rankColor }}
      />
      <div
        className="-skew-x-12 bg-gradient-to-r h-full w-full absolute mr-4 -left-2 z-0"
        style={{
          background: `linear-gradient(to right, ${hexToRgba(rankColor, 0.3)}, ${hexToRgba(rankColor, 0.2)}, ${hexToRgba(rankColor, 0.05)})`,
          border: `1px solid ${hexToRgba(rankColor, 0.25)}`,
        }}
      />

      <div className="relative z-20 mb-0.5 pl-3 pr-1 py-0.5">
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
