import Link from "next/link";
import { CalendarClock, Swords } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@workspace/ui/lib/utils";

import type { ScrimDetail, ScrimTeamRef } from "../types";

function TeamBadge({
  team,
  isMine,
}: {
  team: ScrimTeamRef;
  isMine: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="flex size-12 items-center justify-center">
        {team.avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN team asset */
          <img
            src={team.avatar}
            alt=""
            className="size-full object-contain"
            aria-hidden
          />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {team.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={cn(
          "line-clamp-1 w-full text-xs font-medium",
          isMine && "text-primary",
        )}
      >
        {team.name}
      </span>
    </div>
  );
}

/**
 * Dashboard widget: the viewer's soonest upcoming scrim. `myTeamIds` highlights
 * which side is the viewer's team. Renders nothing fancier than a clickable card
 * that deep-links to the match view.
 */
export function NextScrimWidget({
  scrim,
  myTeamIds,
}: {
  scrim: ScrimDetail;
  myTeamIds: string[];
}) {
  const mine = new Set(myTeamIds);
  const when = new Date(scrim.matchTime);
  const dateLabel = when.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/scrims/match/${scrim.id}`}
      className="group relative block overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {scrim.map?.screenshot ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN map asset */}
          <img
            src={scrim.map.screenshot}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-20 transition-opacity duration-300 group-hover:opacity-30"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40" />
        </>
      ) : null}

      <div className="relative space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {dateLabel}
          </span>
          <span className="font-medium text-primary">
            in {formatDistanceToNow(when)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TeamBadge team={scrim.homeTeam} isMine={mine.has(scrim.homeTeam.id)} />
          <div className="flex shrink-0 flex-col items-center gap-1 text-muted-foreground">
            <Swords className="size-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              vs
            </span>
          </div>
          <TeamBadge team={scrim.awayTeam} isMine={mine.has(scrim.awayTeam.id)} />
        </div>

        {scrim.map ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            {scrim.map.badge ? (
              /* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN map asset */
              <img
                src={scrim.map.badge}
                alt=""
                className="size-4 object-contain"
                aria-hidden
              />
            ) : null}
            <span>{scrim.map.name}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
