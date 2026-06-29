import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

import { canonicalPath } from "@/entities/players/lib/resolve";
import type { DeathmatchRow } from "@/entities/deathmatch/types";

function rowName(row: DeathmatchRow): string {
  return row.personaname?.trim() || row.steamid64 || "Unknown";
}

/**
 * Compact right-rail widget: top deathmatch fraggers by kills. Presentational —
 * the page passes already-ranked rows from `getDeathmatchLeaderboard`.
 */
export function LeaderboardSnippet({ rows }: { rows: DeathmatchRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No deathmatch stats yet.
      </div>
    );
  }

  return (
    <ul className="bg-card divide-border divide-y rounded-xl border">
      {rows.map((row, i) => {
        const name = rowName(row);
        const inner = (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-muted-foreground w-4 shrink-0 text-center text-xs font-semibold tabular-nums">
              {i + 1}
            </span>
            <Avatar className="size-7 shrink-0">
              {row.avatarfull ? <AvatarImage src={row.avatarfull} alt="" /> : null}
              <AvatarFallback className="text-[10px]">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {name}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {row.kills ?? 0}
              <span className="text-muted-foreground ml-1 text-xs font-normal">
                K
              </span>
            </span>
          </div>
        );

        return (
          <li key={row.steamid64 ?? i}>
            {row.isTracked && row.steamid64 ? (
              <Link
                href={canonicalPath(row.steamid64)}
                className="hover:bg-accent block transition-colors"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
