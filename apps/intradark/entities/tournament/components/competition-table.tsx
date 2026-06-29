"use client";

import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { leagueIcon } from "../lib/league-icon";
import type { CompetitionSummary } from "../types";
import { FormatBadge, SeasonStatusBadge } from "./format-badge";

function formatPrize(amount: string | null, currency: string | null): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${currency === "USD" || !currency ? "$" : `${currency} `}${n.toLocaleString()}`;
}

/** All non-PUG competitions, listed in a clickable shadcn table. */
export function CompetitionTable({
  competitions,
}: {
  competitions: CompetitionSummary[];
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Competition</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Entrants</TableHead>
            <TableHead className="text-right">Prize pool</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitions.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => router.push(`/tournaments/${c.slug}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  {leagueIcon(c.slug) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={leagueIcon(c.slug)!}
                      alt=""
                      className="size-8 shrink-0 object-contain"
                    />
                  ) : null}
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.gameMode}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <FormatBadge format={c.format} />
              </TableCell>
              <TableCell>
                <SeasonStatusBadge status={c.currentSeasonStatus} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {c.entrantCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPrize(c.prizePool, c.prizeCurrency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
