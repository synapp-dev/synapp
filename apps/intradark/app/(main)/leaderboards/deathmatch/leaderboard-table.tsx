"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { fetchDeathmatchLeaderboard } from "@/entities/deathmatch/actions";
import type { DeathmatchRow } from "@/entities/deathmatch/types";
import { CountryFlag } from "@/entities/players/components/country-flag";
import { canonicalPath } from "@/entities/players/lib/resolve";
import { createBrowserClient } from "@/utils/supabase/client";

function displayName(row: DeathmatchRow): string {
  return row.personaname?.trim() || row.steamid64 || "Unknown";
}

function PlayerCell({ row }: { row: DeathmatchRow }) {
  const name = displayName(row);
  const inner = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        {row.avatarfull ? <AvatarImage src={row.avatarfull} alt="" /> : null}
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{name}</span>
      {row.countryFlag ? (
        <CountryFlag
          code={row.countryFlag}
          className="h-3.5 w-5 shrink-0 rounded-sm"
        />
      ) : null}
      {!row.isTracked ? (
        <Badge variant="outline" className="shrink-0">
          Guest
        </Badge>
      ) : null}
    </div>
  );

  if (row.isTracked && row.steamid64) {
    return (
      <Link href={canonicalPath(row.steamid64)} className="hover:underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function DeathmatchLeaderboardTable({
  initialRows,
}: {
  initialRows: DeathmatchRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [live, setLive] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    // New deathmatch events arrive in flush batches → many INSERTs at once.
    // Debounce so we re-aggregate once per batch, not once per row.
    const channel = supabase
      .channel(`dm-leaderboard:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_kill_events" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            void fetchDeathmatchLeaderboard().then(setRows);
          }, 800);
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            live ? "animate-pulse bg-green-500" : "bg-muted-foreground/40"
          }`}
          aria-hidden
        />
        {live ? "Live — updates as new events arrive" : "Connecting…"}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No deathmatch stats yet. Play on a server running the IntradarkDmStats
          plugin to populate the board.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Kills</TableHead>
              <TableHead className="text-right">Deaths</TableHead>
              <TableHead className="text-right">Assists</TableHead>
              <TableHead className="text-right">K/D</TableHead>
              <TableHead className="text-right">HS%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.steamid64 ?? i}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <PlayerCell row={row} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {row.kills ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.deaths ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.assists ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.kd ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.hsPct != null ? `${row.hsPct}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
