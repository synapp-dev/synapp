import React, { useEffect, useState } from "react";

interface FaceitLevelBadgeProps {
  level: number;
  size?: "xl" | "lg" | "base" | "sm" | "xs";
}

const SIZE_MAP = {
  xl: { px: 96, font: 48 },
  lg: { px: 72, font: 36 },
  base: { px: 48, font: 24 },
  sm: { px: 32, font: 16 },
  xs: { px: 20, font: 10 },
};

function getLevelColor(level: number): string {
  if (level === 1) return "#fff"; // white
  if (level === 2 || level === 3) return "#00C853"; // green
  if (level >= 4 && level <= 7) return "#FFD600"; // yellow
  if (level === 8 || level === 9) return "#FF9100"; // orange
  if (level === 10) return "#FF2C00"; // red
  return "#888"; // fallback gray
}

const SEGMENTS = 10;
const INACTIVE_COLOR = "#333";

function round(num: number, decimals = 4) {
  return Number(num.toFixed(decimals));
}

function getSegmentCoords(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  // Convert angles to radians
  const start = ((startAngle - 90) * Math.PI) / 180;
  const end = ((endAngle - 90) * Math.PI) / 180;
  return {
    x1: round(cx + r * Math.cos(start)),
    y1: round(cy + r * Math.sin(start)),
    x2: round(cx + r * Math.cos(end)),
    y2: round(cy + r * Math.sin(end)),
  };
}

export const FaceitLevelBadge: React.FC<FaceitLevelBadgeProps> = ({
  level,
  size = "base",
}) => {
  const { px, font } = SIZE_MAP[size] || SIZE_MAP.base;
  const strokeWidth = Math.max(2, Math.round(px / 8));
  const radius = (px - strokeWidth) / 2;
  const center = px / 2;
  const arcTotal = 270; // degrees
  const segmentAngle = arcTotal / SEGMENTS;
  const gapAngle = 0; // No gap between segments
  const arcAngle = segmentAngle;
  // The arc starts at 135deg (bottom left) and ends at 45deg (bottom right), so the gap is at the right after 90deg rotation
  const arcStart = 135 + 90; // degrees, 225deg

  // Clamp level to [0, SEGMENTS]
  const clampedLevel = Math.max(0, Math.min(level, SEGMENTS));

  // Animation state
  const [displayedLevel, setDisplayedLevel] = useState(0);
  const [numberOpacity, setNumberOpacity] = useState(1);
  const [segmentScales, setSegmentScales] = useState<number[]>(
    Array(SEGMENTS).fill(0)
  );

  useEffect(() => {
    let frame: number;
    let cancelled = false;
    const duration = 1500; // ms
    const steps = Math.abs(clampedLevel - 0);
    if (steps === 0) {
      setDisplayedLevel(clampedLevel);
      setSegmentScales(Array(SEGMENTS).fill(1));
      return;
    }
    const interval = duration / SEGMENTS;
    setDisplayedLevel(0);
    setSegmentScales(Array(SEGMENTS).fill(0));
    let current = 0;
    function animate() {
      if (cancelled) return;
      if (current < clampedLevel) {
        setNumberOpacity(0); // Start fade out
        setTimeout(() => {
          setDisplayedLevel(current);
          setNumberOpacity(1); // Fade in
        }, 100); // Quick fade out/in
        setSegmentScales((prev) => {
          const next = [...prev];
          next[current - 1] = 1;
          return next;
        });
        current++;
        frame = window.setTimeout(animate, interval);
      } else {
        setDisplayedLevel(clampedLevel);
        setNumberOpacity(1);
      }
    }
    animate();
    return () => {
      cancelled = true;
      if (frame) clearTimeout(frame);
    };
  }, [clampedLevel]);

  // The color and number should animate with the displayedLevel
  const animatedColor = getLevelColor(displayedLevel);

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const startAngle = arcStart + i * segmentAngle + gapAngle / 2;
    const endAngle = startAngle + arcAngle;
    const { x1, y1, x2, y2 } = getSegmentCoords(
      center,
      center,
      radius,
      startAngle,
      endAngle
    );
    const largeArcFlag = arcAngle > 180 ? 1 : 0;
    const isActive = i < displayedLevel;
    const scale = segmentScales[i] || 0;
    // Animate the arc by interpolating the end angle
    const interpEndAngle = startAngle + (endAngle - startAngle) * scale;
    const { x2: ix2, y2: iy2 } = getSegmentCoords(
      center,
      center,
      radius,
      startAngle,
      interpEndAngle
    );
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${ix2} ${iy2}`;
    return (
      <path
        key={i}
        d={d}
        stroke={isActive ? animatedColor : INACTIVE_COLOR}
        strokeWidth={strokeWidth}
        fill="none"
        style={{
          transition: "d 0.25s cubic-bezier(.4,2,.6,1), stroke 0.2s",
        }}
      />
    );
  });

  return (
    <div
      style={{
        width: px,
        height: px,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#222",
        borderRadius: "50%",
        userSelect: "none",
      }}
      title={`FACEIT Level ${clampedLevel}`}
    >
      <svg
        width={px}
        height={px}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {segments}
      </svg>
      <span
        style={{
          position: "relative",
          color: animatedColor,
          fontWeight: 700,
          fontSize: font,
          zIndex: 1,
          lineHeight: 1,
          opacity: numberOpacity,
          transition: "color 0.2s, opacity 0.2s cubic-bezier(.4,2,.6,1)",
        }}
      >
        {displayedLevel}
      </span>
    </div>
  );
};
