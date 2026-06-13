"use client";

import Link from "next/link";
import { toast } from "sonner";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  useStockCountActionMutation,
  useStockCountDetailQuery,
} from "@/entities/stock-counts/model/use-stock-counts-query";

type StockCountDetailPageProps = {
  organisation: string;
  venue: string;
  countId: string;
};

export function StockCountDetailPage({
  organisation,
  venue,
  countId,
}: StockCountDetailPageProps) {
  const { data, isLoading, error } = useStockCountDetailQuery({
    organisation,
    venue,
    countId,
  });
  const actionMutation = useStockCountActionMutation({ organisation, venue, countId });

  async function runAction(action: string, body?: Record<string, unknown>) {
    try {
      await actionMutation.mutateAsync({ action, body });
      toast.success(`Count ${action.replace("-", " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (error || !data) {
    return <p className="text-destructive text-sm">{error?.message ?? "Not found"}</p>;
  }

  const topVariances = [...data.entries]
    .filter((e) => e.varianceCents !== null)
    .sort((a, b) => Math.abs(b.varianceCents ?? 0) - Math.abs(a.varianceCents ?? 0))
    .slice(0, 10);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{data.status.replace("_", " ")}</Badge>
            {data.isBaseline ? <Badge variant="outline">Baseline</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === "in_progress" ? (
            <Button asChild variant="outline">
              <Link
                href={buildScopedPath(
                  organisation,
                  venue,
                  `stock-management/stock-counts/${countId}/count`,
                )}
              >
                Continue counting
              </Link>
            </Button>
          ) : null}
          {data.allowedActions.includes("approve") ? (
            <Button onClick={() => runAction("approve")}>Approve</Button>
          ) : null}
          {data.allowedActions.includes("reject") ? (
            <Button variant="outline" onClick={() => runAction("reject", { rejectionReason: "Needs review" })}>
              Reject
            </Button>
          ) : null}
          {data.allowedActions.includes("export") ? (
            <Button asChild variant="outline">
              <a
                href={`/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/stock-counts/${encodeURIComponent(countId)}/export`}
              >
                Export CSV
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {data.status === "pending_approval" || data.status === "approved" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variance summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topVariances.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.ingredientName}</TableCell>
                    <TableCell>{entry.expectedQty ?? "—"}</TableCell>
                    <TableCell>{entry.countedQty ?? "—"}</TableCell>
                    <TableCell>
                      {entry.varianceCents !== null
                        ? `$${(entry.varianceCents / 100).toFixed(2)}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="ghost">
        <Link href={buildScopedPath(organisation, venue, "stock-management/stock-counts")}>
          Back to list
        </Link>
      </Button>
    </section>
  );
}
