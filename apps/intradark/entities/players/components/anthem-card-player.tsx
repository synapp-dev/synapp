"use client";

import { useEffect, useRef } from "react";

import { anthemProvider } from "@/entities/players/lib/anthem";
import { useAnthemPlayer } from "@/entities/players/components/anthem-player-provider";
import { AnthemPlayerControl } from "@/entities/players/components/anthem-player-control";

/**
 * Lives in the profile's anthem card. Renders the full card controller and
 * reports viewport visibility so the compact header control can take over once
 * the card scrolls away. Anthem registration is owned by `PlayerProfile` so
 * playback can start before this card is on screen.
 */
export function AnthemCardPlayer({
  anthemUrl,
  variant = "card",
}: {
  anthemUrl: string | null;
  variant?: "card" | "social";
}) {
  const { setCardVisible } = useAnthemPlayer();
  const isSoundcloud =
    !!anthemUrl && anthemProvider(anthemUrl) === "soundcloud";
  const ref = useRef<HTMLDivElement>(null);

  // Anthem registration lives on `PlayerProfile` so playback can start before
  // this card is visible. Here we only report viewport visibility for the
  // compact header control.

  // Tell the shared player whether this card is on screen. The compact header
  // control reads `cardVisible` and only renders once the card scrolls away.
  useEffect(() => {
    const el = ref.current;
    if (!el || !isSoundcloud) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCardVisible(entry?.isIntersecting ?? false),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setCardVisible(true);
    };
  }, [isSoundcloud, setCardVisible]);

  if (!isSoundcloud) return null;
  return (
    <div ref={ref}>
      <AnthemPlayerControl variant={variant === "social" ? "social" : "card"} />
    </div>
  );
}
