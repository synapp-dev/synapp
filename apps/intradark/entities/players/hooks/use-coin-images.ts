"use client";

import { useEffect, useState } from "react";

export interface CoinImage {
  defindex: number;
  name: string | null;
  image: string;
}

type CoinMap = Record<string, { name: string | null; image: string }>;

// The full def_index -> image map is ~150KB, so it is code-split and loaded on
// demand (only when a profile with showcased coins is rendered) and memoized
// across mounts.
let cache: CoinMap | null = null;

/** Resolve showcased coin defindexes to their Steam economy images. */
export function useCoinImages(defindexes: number[]): {
  coins: CoinImage[];
  loading: boolean;
} {
  const [map, setMap] = useState<CoinMap | null>(cache);

  useEffect(() => {
    if (cache) {
      setMap(cache);
      return;
    }
    let cancelled = false;
    void import("@/entities/players/lib/coin-images.json").then((mod) => {
      cache = (mod.default ?? mod) as CoinMap;
      if (!cancelled) setMap(cache);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const coins: CoinImage[] = map
    ? defindexes
        .map((defindex) => {
          const entry = map[String(defindex)];
          return entry
            ? { defindex, name: entry.name, image: entry.image }
            : null;
        })
        .filter((c): c is CoinImage => c !== null)
    : [];

  return { coins, loading: !map && defindexes.length > 0 };
}
