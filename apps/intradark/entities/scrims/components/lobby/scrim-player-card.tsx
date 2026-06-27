"use client";

/* eslint-disable @next/next/no-img-element -- remote Steam avatars */
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import type { TeamRosterMember } from "@/entities/teams/types";

export function ScrimPlayerCard({
  player,
}: {
  player: TeamRosterMember | null;
}) {
  if (!player) {
    return (
      <div className="flex h-14 items-center gap-3 rounded-lg border border-border/40 px-4 text-muted-foreground/50">
        <div className="size-7 rounded-full bg-muted" />
        <span className="text-sm font-bold">Empty Slot</span>
      </div>
    );
  }

  const isLeader = player.role === "leader" || player.role === "captain";

  return (
    <Link
      href={player.profileHref}
      className={cn(
        "flex h-14 items-center justify-between gap-3 rounded-lg border bg-card px-4 transition-colors hover:bg-accent",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt=""
            className="size-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="size-7 shrink-0 rounded-full bg-muted" />
        )}
        <span className="truncate text-sm font-bold">{player.displayName}</span>
      </div>
      {isLeader ? (
        <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase text-yellow-400">
          <ShieldCheck className="size-3.5" />
          {player.role}
        </span>
      ) : null}
    </Link>
  );
}
