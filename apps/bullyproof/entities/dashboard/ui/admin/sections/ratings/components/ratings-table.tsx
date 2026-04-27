"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { StageLessonRatingRow } from "@/entities/ratings/api/endpoints";
import { ratingsTableColumns } from "./ratings-table-columns";

type RatingsTableProps = {
  rows: StageLessonRatingRow[];
  onRowClick: (row: StageLessonRatingRow) => void;
};

export function RatingsTable({ rows, onRowClick }: RatingsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {ratingsTableColumns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.feedbackId}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() => onRowClick(row)}
            >
              {ratingsTableColumns.map((column) => (
                <TableCell key={`${row.feedbackId}-${column.key}`} className={column.className}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
