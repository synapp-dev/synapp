"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { DEMO_INSIGHTS, type InsightMeta, type InsightResult } from "@/entities/demos/lib/types";

import { DemoReplay } from "./demos-replay";

type Loaded = {
  token: string;
  fileName: string;
  sizeBytes: number;
  header: InsightResult | null;
  headerError: string | null;
};

type ActiveResult = {
  insight: InsightMeta;
  loading: boolean;
  tookMs?: number;
  result?: InsightResult;
  error?: string;
};

const GROUP_ORDER: InsightMeta["group"][] = [
  "Overview",
  "Combat",
  "Rounds",
  "Utility",
  "Raw",
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DemosHarness() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveResult | null>(null);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: DEMO_INSIGHTS.filter((i) => i.group === group),
    })).filter((g) => g.items.length > 0);
  }, []);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setActive(null);
    setLoaded(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/devtools/demos/load", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUploadError(data?.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }
      setLoaded({
        token: data.token,
        fileName: data.fileName,
        sizeBytes: data.sizeBytes,
        header: data.header ?? null,
        headerError: data.headerError ?? null,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const runInsight = useCallback(
    async (insight: InsightMeta) => {
      if (!loaded) return;
      setActive({ insight, loading: true });
      try {
        const res = await fetch("/api/devtools/demos/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: loaded.token, insight: insight.id }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setActive({ insight, loading: false, error: data?.error ?? `HTTP ${res.status}` });
          return;
        }
        setActive({ insight, loading: false, result: data.result, tookMs: data.tookMs });
      } catch (err) {
        setActive({
          insight,
          loading: false,
          error: err instanceof Error ? err.message : "Parse failed",
        });
      }
    },
    [loaded],
  );

  const unload = useCallback(async () => {
    const token = loaded?.token;
    setLoaded(null);
    setActive(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (token) {
      void fetch("/api/devtools/demos/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    }
  }, [loaded]);

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">1 · Load a demo</CardTitle>
          <CardDescription>
            Pick a CS2 <code className="rounded bg-muted px-1 py-0.5 text-xs">.dem</code> file.
            It is uploaded once to a temp file and reused for every insight below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".dem"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
              className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {uploading && <span className="text-sm text-muted-foreground">Uploading & parsing header…</span>}
            {loaded && (
              <Button variant="outline" size="sm" onClick={() => void unload()}>
                Unload
              </Button>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          {loaded && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{loaded.fileName}</Badge>
                <span className="text-muted-foreground">{formatBytes(loaded.sizeBytes)}</span>
              </div>
              {loaded.headerError ? (
                <p className="text-sm text-destructive">
                  Header parse failed: {loaded.headerError}
                </p>
              ) : (
                loaded.header && <ResultView result={loaded.header} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">2 · Pull insights</CardTitle>
          <CardDescription>
            {loaded
              ? "Each button runs one curated extraction against the loaded demo."
              : "Load a demo above to enable these."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.map(({ group, items }) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((insight) => (
                  <Button
                    key={insight.id}
                    variant={active?.insight.id === insight.id ? "default" : "secondary"}
                    size="sm"
                    title={insight.description}
                    disabled={!loaded || active?.loading}
                    onClick={() => void runInsight(insight)}
                  >
                    {insight.label}
                    {insight.heavy && (
                      <span className="ml-1.5 text-[10px] opacity-70">heavy</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Radar replay */}
      {loaded && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">3 · Radar replay</CardTitle>
            <CardDescription>
              2D positional replay projected onto the map radar. Pick a round and
              scrub. (PoC — dust2 is the verified map.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemoReplay key={loaded.token} token={loaded.token} />
          </CardContent>
        </Card>
      )}

      {/* Result */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Result</CardTitle>
          <CardDescription>
            {active
              ? `${active.insight.label}${active.loading ? " · parsing…" : ""}${
                  active.tookMs != null ? ` · ${active.tookMs} ms` : ""
                }`
              : "No insight run yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!active && <p className="text-sm text-muted-foreground">—</p>}
          {active?.loading && <p className="text-sm text-muted-foreground">Parsing…</p>}
          {active?.error && <p className="text-sm text-destructive">{active.error}</p>}
          {active?.result && <ResultView result={active.result} />}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultView({ result }: { result: InsightResult }) {
  if (result.kind === "kv") {
    return (
      <div className="space-y-2">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {result.pairs.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b py-1 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono text-xs">{String(value)}</dd>
            </div>
          ))}
        </dl>
        {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
      </div>
    );
  }

  if (result.kind === "table") {
    return (
      <div className="space-y-2">
        {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
        <div className="max-h-[32rem] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {result.columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="font-mono text-xs">
                      {renderCell(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {result.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No rows.</p>
        )}
      </div>
    );
  }

  return (
    <pre className="max-h-[32rem] overflow-auto rounded bg-muted p-3 text-xs">
      {JSON.stringify(result.data, null, 2)}
    </pre>
  );
}

function renderCell(cell: unknown) {
  if (cell === true) return "✓";
  if (cell === false) return "·";
  if (cell == null) return "—";
  return String(cell);
}
