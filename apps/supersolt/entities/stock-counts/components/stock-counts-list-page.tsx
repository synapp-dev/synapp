"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  useCreateStockCountMutation,
  useStockCountsQuery,
} from "@/entities/stock-counts/model/use-stock-counts-query";
import type { CreateStockCountInput } from "@/server/stock-counts/stock-counts.types";
import { useState } from "react";

type StockCountsListPageProps = {
  organisation: string;
  venue: string;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

function formatVariance(cents: number | null): string {
  if (cents === null) return "—";
  const dollars = cents / 100;
  const prefix = dollars < 0 ? "short" : "over";
  return `$${Math.abs(dollars).toFixed(0)} ${prefix}`;
}

export function StockCountsListPage({
  organisation,
  venue,
}: StockCountsListPageProps) {
  const router = useRouter();
  const { data, isLoading, error } = useStockCountsQuery({ organisation, venue });
  const createMutation = useCreateStockCountMutation({ organisation, venue });
  const [createOpen, setCreateOpen] = useState(false);
  const canStartCount = (data?.activeIngredientCount ?? 0) > 0;
  const ingredientsPath = buildScopedPath(organisation, venue, "menu/ingredients");

  async function handleNewCount(input?: CreateStockCountInput) {
    try {
      const created = await createMutation.mutateAsync(input);
      toast.success("Stock count started");
      setCreateOpen(false);
      router.push(
        buildScopedPath(
          organisation,
          venue,
          `stock-management/stock-counts/${created.id}/count`,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create count");
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Stock Counts</h1>
          <p className="text-muted-foreground text-sm">
            Capture on-hand inventory and review variance against expected stock.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={createMutation.isPending || !canStartCount}>
              <Plus className="mr-2 size-4" />
              New count
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start stock count</DialogTitle>
              <DialogDescription>
                Choose what to count. Cycle counts sample ~25% of ingredients.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full"
                onClick={() => void handleNewCount({ scopeType: "full" })}
                disabled={createMutation.isPending}
              >
                Full count
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  void handleNewCount({
                    scopeType: "cycle",
                    scopeFilter: { cycleFraction: 0.25 },
                  })
                }
                disabled={createMutation.isPending}
              >
                Cycle count (25%)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!isLoading && data && !canStartCount ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add ingredients first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              This venue has no active ingredients yet. Stock counts need an ingredient list
              before you can start counting.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={ingredientsPath}>Go to Ingredients</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cadence</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {data?.lastApprovedAt ? (
            <p>
              Last approved count{" "}
              {data.daysSinceLastCount === 0
                ? "today"
                : `${data.daysSinceLastCount} day(s) ago`}
              .
            </p>
          ) : (
            <p>No approved counts yet. Run your first count to establish baseline stock.</p>
          )}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4" />
            Count history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground px-6 py-8 text-sm">Loading counts…</p>
          ) : !data?.counts.length ? (
            <div className="flex flex-col items-start gap-3 px-6 py-8">
              <p className="text-muted-foreground text-sm">No stock counts yet.</p>
              {canStartCount ? (
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  Start first count
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href={ingredientsPath}>Add ingredients</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.counts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">{count.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STATUS_LABEL[count.status] ?? count.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {count.completedItemCount} / {count.itemCount}
                    </TableCell>
                    <TableCell>{formatVariance(count.totalVarianceCents)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={buildScopedPath(
                            organisation,
                            venue,
                            count.status === "in_progress"
                              ? `stock-management/stock-counts/${count.id}/count`
                              : `stock-management/stock-counts/${count.id}`,
                          )}
                        >
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
