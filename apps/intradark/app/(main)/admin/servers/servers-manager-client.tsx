"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";

import type {
  RedlinePowerSignal,
  RedlineServerSummary,
} from "@/entities/redline/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; notConfigured?: boolean }
  | { kind: "ready"; servers: RedlineServerSummary[] };

/** Best-effort mapping of Redline status strings to a badge tone. */
function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toLowerCase();
  if (s === "running") return "default";
  if (s === "installing" || s === "starting" || s === "restarting")
    return "secondary";
  if (s === "offline" || s === "stopped" || s === "suspended")
    return "outline";
  if (s.includes("error") || s.includes("fail")) return "destructive";
  return "secondary";
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as
    | { error?: string }
    | null;
  return body?.error ?? `Request failed (HTTP ${res.status})`;
}

export function ServersManagerClient({ configured }: { configured: boolean }) {
  const [state, setState] = React.useState<FetchState>({ kind: "idle" });
  /** Server id → label of the in-flight action, so we can disable its row. */
  const [busy, setBusy] = React.useState<Record<string, string>>({});
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/redline/servers", { cache: "no-store" });
      if (!res.ok) {
        const message = await readError(res);
        setState({ kind: "error", message, notConfigured: res.status === 503 });
        return;
      }
      const data = (await res.json()) as { servers?: RedlineServerSummary[] };
      setState({ kind: "ready", servers: data.servers ?? [] });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  React.useEffect(() => {
    if (configured) void load();
    else
      setState({
        kind: "error",
        message:
          "REDLINE_API_KEY is not set — add it to .env.local to manage live servers.",
        notConfigured: true,
      });
  }, [configured, load]);

  const markBusy = (id: string, label: string | null) =>
    setBusy((prev) => {
      const next = { ...prev };
      if (label) next[id] = label;
      else delete next[id];
      return next;
    });

  async function power(server: RedlineServerSummary, signal: RedlinePowerSignal) {
    markBusy(server.id, signal);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/redline/servers/${encodeURIComponent(server.id)}/power`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal }),
        },
      );
      if (!res.ok) {
        setNotice(`“${server.name}” ${signal} failed: ${await readError(res)}`);
      } else {
        setNotice(`Sent ${signal} to “${server.name}”.`);
        void load();
      }
    } finally {
      markBusy(server.id, null);
    }
  }

  async function remove(server: RedlineServerSummary) {
    markBusy(server.id, "delete");
    setNotice(null);
    try {
      const res = await fetch(
        `/api/redline/servers/${encodeURIComponent(server.id)}?force=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setNotice(`Deleting “${server.name}” failed: ${await readError(res)}`);
      } else {
        setNotice(`Deleted “${server.name}”.`);
        void load();
      }
    } finally {
      markBusy(server.id, null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            disabled={!configured || state.kind === "loading"}
          >
            <RefreshCw
              className={`h-4 w-4 ${state.kind === "loading" ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {state.kind === "ready" ? (
            <span className="text-muted-foreground text-sm">
              {state.servers.length} server
              {state.servers.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/sandbox/redline">
            Provision (Redline harness)
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {notice ? (
        <p className="text-muted-foreground rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      {state.kind === "error" ? (
        <Card
          className={
            state.notConfigured
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-destructive/40 bg-destructive/5"
          }
        >
          <CardHeader>
            <CardTitle className="text-base">
              {state.notConfigured ? "Redline not configured" : "Couldn’t load servers"}
            </CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.kind === "ready" && state.servers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No servers</CardTitle>
            <CardDescription>
              Nothing is provisioned yet. Use the{" "}
              <Link
                href="/admin/sandbox/redline"
                className="text-primary font-medium hover:underline"
              >
                Redline harness
              </Link>{" "}
              to spin one up.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.kind === "ready" && state.servers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Egg</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.servers.map((server) => {
                const action = busy[server.id];
                const disabled = Boolean(action);
                return (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">
                      {server.name}
                      <span className="text-muted-foreground block font-mono text-xs">
                        {server.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(server.status)}>
                        {server.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {server.egg}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {server.address ?? "—"}
                      {server.tv_address ? (
                        <span className="text-muted-foreground block">
                          tv: {server.tv_address}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Start"
                          disabled={disabled}
                          onClick={() => void power(server, "start")}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Stop"
                          disabled={disabled}
                          onClick={() => void power(server, "stop")}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Restart"
                          disabled={disabled}
                          onClick={() => void power(server, "restart")}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              disabled={disabled}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete “{server.name}”?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This force-deletes the server on Redline. This
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void remove(server)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
