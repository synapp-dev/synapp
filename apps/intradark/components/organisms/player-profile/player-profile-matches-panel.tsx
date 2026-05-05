"use client";

import { useState } from "react";
import { Activity } from "lucide-react";

import {
  MATCHES_RECENT,
  MATCHES_UPCOMING,
  type MatchRow,
} from "@/lib/player-profile-showcase-data";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";

type MatchTab = "recent" | "upcoming";

const sectionShell =
  "border-white/10 bg-[#0a0f1c] text-white shadow-black/40 shadow-xl";

const pillToggleClass =
  "data-[state=on]:border-primary data-[state=on]:text-primary-foreground data-[state=on]:bg-primary/15 border-white/20 text-white/70";

function opponentInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ratingBadgeClass(rating: number) {
  if (rating <= 0) {
    return "border-white/25 text-white/50";
  }
  if (rating >= 1.15) {
    return "border-chart-2/70 text-chart-2";
  }
  if (rating >= 0.95) {
    return "border-chart-4/70 text-chart-4";
  }
  return "border-chart-1/70 text-chart-1";
}

function MatchRowView({ row }: { row: MatchRow }) {
  return (
    <div
      className={cn(
        "flex flex-row gap-3 py-4 first:pt-2",
        row.win ? "border-l-2 border-chart-2 pl-3" : "border-l-2 border-chart-1 pl-3",
      )}
    >
      <div className="flex shrink-0 flex-row items-center gap-1.5 pt-0.5">
        <Avatar className="size-9 border border-white/10">
          <AvatarFallback className="bg-white/10 text-[10px] font-semibold text-white">
            BP
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-white/40">×</span>
        <Avatar className="size-9 border border-white/10">
          <AvatarFallback className="bg-white/10 text-[10px] font-semibold text-white">
            {opponentInitials(row.opponent)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-base font-bold text-white">
          {row.opponent}
        </p>
        <p className="text-xs text-white/55">
          {row.event}
          <span className="text-white/35"> · </span>
          {row.date}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-start gap-1.5 text-right">
        <p className="text-lg font-bold tabular-nums text-white">
          {row.score}
        </p>
        {row.rating > 0 ? (
          <Badge
            variant="outline"
            className={cn("gap-1", ratingBadgeClass(row.rating))}
          >
            <Activity aria-hidden />
            {row.rating.toFixed(2)}
          </Badge>
        ) : (
          <Badge variant="outline" className={ratingBadgeClass(0)}>
            —
          </Badge>
        )}
      </div>
    </div>
  );
}

export type PlayerProfileMatchesPanelProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileMatchesPanel({
  playerId,
  className,
}: PlayerProfileMatchesPanelProps) {
  void playerId;
  const [tab, setTab] = useState<MatchTab>("recent");
  const rows = tab === "recent" ? MATCHES_RECENT : MATCHES_UPCOMING;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-white">Matches</h2>
        <ToggleGroup
          type="single"
          value={tab}
          onValueChange={(v) => {
            if (v === "recent" || v === "upcoming") setTab(v);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="rounded-full border border-white/15 bg-black/20 p-0.5"
        >
          <ToggleGroupItem
            value="recent"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            Recent
          </ToggleGroupItem>
          <ToggleGroupItem
            value="upcoming"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            Upcoming
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className={cn("py-4", sectionShell)}>
        <CardContent className="flex flex-col gap-0 px-4 sm:px-6">
          {rows.map((row, index) => (
            <div key={row.id}>
              {index > 0 ? <Separator className="bg-white/10" /> : null}
              <MatchRowView row={row} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
