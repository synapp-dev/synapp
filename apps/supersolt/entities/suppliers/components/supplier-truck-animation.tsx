"use client";

/**
 * A little driving-truck diorama for the suppliers empty state: the road's lane
 * markings scroll past, the wheels spin, and the body does a gentle drive-bob —
 * so the truck reads as moving while staying put. Themed via CSS tokens and
 * disabled under `prefers-reduced-motion`.
 */
export function SupplierTruckAnimation({ className }: { className?: string }) {
  // Lane dashes laid one period (28px) wider than the viewBox on each side so the
  // -28px scroll loops seamlessly.
  const dashes = Array.from({ length: 12 }, (_, i) => -28 + i * 28);

  // Parallax scenery. Each set is drawn twice (offset by the viewBox width) and
  // scrolled -260px so it loops seamlessly. Clouds drift slow (far), trees scroll
  // faster (mid-ground) — depth cue against the fast road below.
  const clouds = [
    { x: 30, y: 28, s: 1 },
    { x: 120, y: 20, s: 0.8 },
    { x: 205, y: 36, s: 1.15 },
  ];
  const trees = [
    { x: 18, s: 1 },
    { x: 96, s: 0.8 },
    { x: 158, s: 1.15 },
    { x: 232, s: 0.9 },
  ];

  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 260 150"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <style>{`
          .st-road-dashes { transform: translateX(0); }
          .st-wheel { transform-box: fill-box; transform-origin: center; }
          .st-truck { transform-box: fill-box; transform-origin: center; }
          @media (prefers-reduced-motion: no-preference) {
            .st-road-dashes { animation: st-road 0.55s linear infinite; }
            .st-wheel { animation: st-spin 0.7s linear infinite; }
            .st-truck { animation: st-bob 0.5s ease-in-out infinite; }
            .st-speed { animation: st-speed 0.55s linear infinite; }
            .st-speed-2 { animation-delay: 0.18s; }
            .st-speed-3 { animation-delay: 0.34s; }
            .st-clouds { animation: st-scroll 16s linear infinite; }
            .st-trees { animation: st-scroll 5s linear infinite; }
          }
          @keyframes st-scroll { to { transform: translateX(-260px); } }
          @keyframes st-road { to { transform: translateX(-28px); } }
          @keyframes st-spin { to { transform: rotate(360deg); } }
          @keyframes st-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
          @keyframes st-speed {
            0% { opacity: 0; transform: translateX(8px); }
            35% { opacity: 0.65; }
            100% { opacity: 0; transform: translateX(-14px); }
          }
        `}</style>

        {/* Clouds drifting by (furthest back) */}
        <g className="st-clouds">
          {[0, 260].map((off) =>
            clouds.map((c) => (
              <g
                key={`${off}-${c.x}`}
                transform={`translate(${c.x + off} ${c.y}) scale(${c.s})`}
                fill="var(--muted-foreground)"
                opacity="0.16"
              >
                <ellipse cx="0" cy="0" rx="11" ry="7" />
                <ellipse cx="9" cy="2" rx="9" ry="6" />
                <ellipse cx="-9" cy="3" rx="8" ry="5.5" />
              </g>
            )),
          )}
        </g>

        {/* Trees set back on the horizon (mid-ground, behind the truck). Rooted
            just above the road's back edge so the trunks don't show through the
            translucent road band. */}
        <g className="st-trees">
          {[0, 260].map((off) =>
            trees.map((t) => (
              <g
                key={`${off}-${t.x}`}
                transform={`translate(${t.x + off} 106) scale(${t.s * 1.7})`}
              >
                <rect
                  x="-2"
                  y="-13"
                  width="4"
                  height="15"
                  rx="1"
                  fill="var(--muted-foreground)"
                  opacity="0.35"
                />
                <circle cx="0" cy="-20" r="10" fill="var(--brand-supersolt-primary)" opacity="0.38" />
                <circle cx="-7" cy="-14" r="7" fill="var(--brand-supersolt-primary)" opacity="0.38" />
                <circle cx="7" cy="-14" r="7" fill="var(--brand-supersolt-primary)" opacity="0.38" />
              </g>
            )),
          )}
        </g>

        {/* Road */}
        <rect
          x="0"
          y="110"
          width="260"
          height="40"
          fill="var(--muted-foreground)"
          opacity="0.2"
        />
        <g className="st-road-dashes">
          {dashes.map((x) => (
            <rect
              key={x}
              x={x}
              y="128"
              width="16"
              height="4"
              rx="2"
              fill="var(--muted-foreground)"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Speed lines trailing the truck */}
        <g stroke="var(--brand-supersolt-primary)" strokeWidth="3" strokeLinecap="round">
          <line className="st-speed" x1="18" y1="66" x2="34" y2="66" />
          <line className="st-speed st-speed-2" x1="14" y1="80" x2="32" y2="80" />
          <line className="st-speed st-speed-3" x1="20" y1="94" x2="36" y2="94" />
        </g>

        {/* Wheels (grounded, spinning) */}
        {[78, 120, 172].map((cx) => (
          <g key={cx} className="st-wheel">
            <circle cx={cx} cy="112" r="13" fill="var(--foreground)" />
            <circle cx={cx} cy="112" r="4.5" fill="var(--muted)" />
            <line
              x1={cx - 9}
              y1="112"
              x2={cx + 9}
              y2="112"
              stroke="var(--muted)"
              strokeWidth="2"
            />
            <line
              x1={cx}
              y1="103"
              x2={cx}
              y2="121"
              stroke="var(--muted)"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Truck body (gentle drive-bob) */}
        <g className="st-truck">
          {/* Chassis */}
          <rect x="48" y="104" width="148" height="5" rx="2.5" fill="var(--foreground)" />
          {/* Trailer / box */}
          <rect
            x="50"
            y="52"
            width="96"
            height="54"
            rx="7"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          {/* Supersolt livery decal — foreground badge keeps it legible on the
              trailer in both themes; the mark stays brand green. */}
          <svg x="80" y="62" width="36" height="34" viewBox="0 0 150.55 144">
            <rect width="150.55" height="144" rx="25" ry="25" fill="var(--foreground)" />
            <path
              d="M55.41,35.74c-10.02,0-18.13,8.12-18.13,18.13s8.12,18.13,18.13,18.13h57.96v-36.27h-57.96Z"
              fill="var(--brand-supersolt-primary)"
            />
            <path
              d="M95.13,71.99c10.02,0,18.13,8.12,18.13,18.13s-8.12,18.13-18.13,18.13h-57.96v-36.27h57.96Z"
              fill="var(--brand-supersolt-primary)"
            />
          </svg>
          {/* Cab */}
          <rect
            x="148"
            y="66"
            width="34"
            height="42"
            rx="7"
            fill="var(--brand-supersolt-primary)"
          />
          {/* Hood (lower front) */}
          <rect
            x="176"
            y="88"
            width="18"
            height="20"
            rx="5"
            fill="var(--brand-supersolt-primary)"
          />
          {/* Windscreen */}
          <rect
            x="166"
            y="72"
            width="12"
            height="14"
            rx="3"
            fill="var(--background)"
            opacity="0.9"
          />
          {/* Headlight */}
          <circle cx="192" cy="100" r="2.6" fill="var(--background)" />
        </g>
      </svg>
    </div>
  );
}
