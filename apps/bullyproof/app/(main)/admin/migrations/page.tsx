"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Database, CheckCircle2, XCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { getAuthHeaders } from "@/lib/api/fetcher.client";

interface BackfillResult {
  topicSlides: { updated: number; topics: number };
  courseTopicSlides: { updated: number; topics: number };
  total: number;
}

export default function AdminMigrationsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(["admin", "migrations"]);

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/migrations/backfill-slide-positions", {
        method: "POST",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Migrations</h1>
        <p className="text-muted-foreground">
          Run one-off database migrations. Use with caution.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg dark:bg-amber-900/30 dark:text-amber-500">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Backfill slide positions</CardTitle>
              <CardDescription>
                Normalize the <code>position</code> column for topic_slides and
                course_topic_slides (recompute fractional positions). Safe to run
                multiple times (idempotent).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button
              onClick={runBackfill}
              disabled={isRunning}
              variant="secondary"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                "Run backfill"
              )}
            </Button>

            {result && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Done</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  topic_slides: {result.topicSlides.updated} slides across{" "}
                  {result.topicSlides.topics} topics
                </p>
                <p className="text-sm text-muted-foreground">
                  course_topic_slides: {result.courseTopicSlides.updated} slides
                  across {result.courseTopicSlides.topics} topics
                </p>
                <p className="text-sm font-medium">
                  Total: {result.total} slides updated
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
