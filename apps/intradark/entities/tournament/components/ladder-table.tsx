import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import type { LadderRow } from "../types";

export function LadderTable({ rows }: { rows: LadderRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No teams on the ladder yet. New entrants join at the bottom.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="w-24 text-right">Players</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.entrantId}>
            <TableCell className="font-mono font-semibold">
              {r.rank ?? "—"}
            </TableCell>
            <TableCell>{r.displayName}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.memberCount}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
