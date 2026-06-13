"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { forecastApi } from "@/entities/forecast/api/endpoints";
import type { VenueForecastStateDto } from "@/entities/forecast/model/types";

type AdminToolsPageClientProps = {
  organisation: string;
  venue: string;
  venueName: string;
};

type ActionKey = "sync90" | "sync30" | "recompute" | "refresh" | null;

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminToolsPageClient({
  organisation,
  venue,
  venueName,
}: AdminToolsPageClientProps) {
  const [state, setState] = useState<VenueForecastStateDto | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [running, setRunning] = useState<ActionKey>(null);

  const scope = { organisationSlug: organisation, venueSlug: venue };
  const apiBase = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/insights`;

  const loadState = useCallback(async () => {
    setRunning("refresh");
    try {
      const next = await forecastApi.admin.state(scope);
      setState(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load forecast state");
    } finally {
      setRunning(null);
    }
  }, [organisation, venue]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function runSync(daysBack: number, key: ActionKey) {
    setRunning(key);
    setLastResult(null);
    try {
      const result = await forecastApi.post.syncBackfill({ ...scope, daysBack });
      setLastResult(
        `Imported ${result.orderCount} orders across ${result.dayCount} days. forecastReady=${String(result.forecastReady)}`
      );
      toast.success("Square history import finished");
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setRunning(null);
    }
  }

  async function runRecompute() {
    setRunning("recompute");
    setLastResult(null);
    try {
      const result = await forecastApi.post.recompute(scope);
      setLastResult(
        `Recomputed ${result.forecastCount} forecast rows. forecastReady=${String(result.forecastReady)} (${result.availableHistoryDays} history days)`
      );
      toast.success("Forecasts recomputed");
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recompute failed");
    } finally {
      setRunning(null);
    }
  }

  const syncPath = `${apiBase}/forecast/sync`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">DevKit</h1>
        <p className="text-muted-foreground text-sm">
          {venueName} ·{" "}
          <span className="font-mono">
            {organisation}/{venue}
          </span>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Forecast engine</CardTitle>
            {state?.forecastReady ? (
              <Badge variant="default">Forecast ready</Badge>
            ) : (
              <Badge variant="secondary">Cold start / not ready</Badge>
            )}
          </div>
          <CardDescription>
            Import Square payment history into <code className="text-xs">daily_sales</code>, then
            compute <code className="text-xs">forecasts</code>. Requires{" "}
            <code className="text-xs">SUPABASE_ADMIN_KEY</code> on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">History days</dt>
              <dd className="font-medium tabular-nums">
                {state?.availableHistoryDays ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Backfill status</dt>
              <dd className="font-medium">{state?.backfillStatus ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last payments sync</dt>
              <dd className="font-medium">{formatTimestamp(state?.lastPaymentsSyncAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last sales sync</dt>
              <dd className="font-medium">{formatTimestamp(state?.lastDailySalesSyncAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last forecast compute</dt>
              <dd className="font-medium">{formatTimestamp(state?.lastComputedAt)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={running !== null}
              onClick={() => void runSync(90, "sync90")}
            >
              {running === "sync90" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Import Square history (90 days)
            </Button>
            <Button
              variant="outline"
              disabled={running !== null}
              onClick={() => void runSync(30, "sync30")}
            >
              {running === "sync30" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Import (30 days)
            </Button>
            <Button
              variant="outline"
              disabled={running !== null}
              onClick={() => void runRecompute()}
            >
              {running === "recompute" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Recompute forecasts only
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={running !== null}
              onClick={() => void loadState()}
            >
              {running === "refresh" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Refresh status
            </Button>
          </div>

          {lastResult ? (
            <p className="text-muted-foreground rounded-md border bg-muted/40 p-3 text-xs">
              {lastResult}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Console one-liner</CardTitle>
          <CardDescription>
            On{" "}
            <Link
              href={`/${organisation}/${venue}/insights/sales`}
              className="text-primary underline underline-offset-2"
            >
              Sales Insights
            </Link>
            , DevTools → Console:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
            {`await fetch("${syncPath}", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daysBack: 90 }) }).then(r => r.json()).then(console.log)`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
