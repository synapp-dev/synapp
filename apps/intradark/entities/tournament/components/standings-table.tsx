import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import type { StandingRow } from "../lib/queries";

/** Player-ranked leaderboard (PUG steal points / league points). */
export function StandingsTable({
  rows,
  pointsLabel = "Points",
}: {
  rows: StandingRow[];
  pointsLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No results yet — standings populate as matches complete.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="w-24 text-right">{pointsLabel}</TableHead>
          <TableHead className="w-20 text-right">W–L</TableHead>
          <TableHead className="w-16 text-right">Played</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={`${r.name}-${i}`}>
            <TableCell className="font-mono font-semibold">{r.rank ?? i + 1}</TableCell>
            <TableCell>{r.name}</TableCell>
            <TableCell className="text-right font-semibold">
              {Number(r.points).toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.wins}–{r.losses}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.matchesPlayed}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
