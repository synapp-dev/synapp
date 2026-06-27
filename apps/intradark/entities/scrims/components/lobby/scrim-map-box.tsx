"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map art */
import { useEffect, useState } from "react";

import type { ScrimDetail } from "../../types";

function countdown(target: number): string {
  const distance = target - Date.now();
  if (distance < 0) return "Match started";
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  const minutes = Math.floor((distance % 3_600_000) / 60_000);
  const seconds = Math.floor((distance % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  let out = days > 0 ? `${days}d ` : "";
  if (hours > 0) out += `${pad(hours)}h `;
  out += `${pad(minutes)}m ${pad(seconds)}s`;
  return out;
}

export function ScrimMapBox({ scrim }: { scrim: ScrimDetail }) {
  const target = new Date(scrim.matchTime).getTime();
  const [remaining, setRemaining] = useState(() => countdown(target));

  useEffect(() => {
    const id = setInterval(() => setRemaining(countdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div
      style={
        scrim.map?.screenshot
          ? { backgroundImage: `url(${scrim.map.screenshot})` }
          : undefined
      }
      className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border bg-cover bg-center"
    >
      <span className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {scrim.map?.badge ? (
            <img src={scrim.map.badge} alt="" className="h-7 w-auto object-contain" />
          ) : null}
          <h1 className="text-xl font-bold">{scrim.map?.name ?? "TBA"}</h1>
        </div>
        {scrim.active ? (
          <div className="flex flex-col items-center">
            <span className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              Live in
            </span>
            <span className="text-sm font-bold">{remaining}</span>
          </div>
        ) : (
          <span className="text-xs font-bold uppercase text-red-500">Cancelled</span>
        )}
      </div>
    </div>
  );
}
