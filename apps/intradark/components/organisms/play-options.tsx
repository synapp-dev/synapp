"use client";

import type { LucideIcon } from "lucide-react";
import { Crosshair, Crown, Swords, Target, Wrench, Zap } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

export type PlayOptionId =
  | "champions"
  | "scrim"
  | "quick"
  | "deathmatch"
  | "retake"
  | "practice";

export type PlayOption = {
  id: PlayOptionId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Icon tile tint (bg + text). */
  accent: string;
};

/** The play-mode entry points shared by the right sidebar hub and the sidebar Play popout. */
export const PLAY_OPTIONS: PlayOption[] = [
  {
    id: "champions",
    title: "Champions League",
    description: "Queue ranked 5v5",
    icon: Crown,
    accent: "bg-amber-500/15 text-amber-500",
  },
  {
    id: "scrim",
    title: "Create a scrim",
    description: "Post a listing for your team",
    icon: Swords,
    accent: "bg-violet-500/15 text-violet-500",
  },
  {
    id: "quick",
    title: "Quick match",
    description: "Find a casual game fast",
    icon: Zap,
    accent: "bg-sky-500/15 text-sky-500",
  },
  {
    id: "deathmatch",
    title: "Deathmatch",
    description: "Jump into a DM server",
    icon: Crosshair,
    accent: "bg-red-500/15 text-red-500",
  },
  {
    id: "retake",
    title: "Retakes",
    description: "Join a retake server",
    icon: Target,
    accent: "bg-orange-500/15 text-orange-500",
  },
  {
    id: "practice",
    title: "Practice",
    description: "Launch a private server",
    icon: Wrench,
    accent: "bg-emerald-500/15 text-emerald-500",
  },
];

/** Clickable list of play-mode cards. Callers decide what selecting one does. */
export function PlayOptions({
  onSelect,
}: {
  onSelect: (option: PlayOption) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {PLAY_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors",
              "hover:bg-accent hover:border-accent-foreground/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
                opt.accent,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{opt.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
