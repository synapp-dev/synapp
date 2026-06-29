"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { reviewAcFlag, type AcFlagRow } from "@/entities/anticheat/admin-actions";

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
  info: "outline",
};

export function AcFlagsTable({ flags }: { flags: AcFlagRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function act(flagId: string, decision: "confirm" | "dismiss") {
    setBusyId(flagId);
    startTransition(async () => {
      try {
        const res = await reviewAcFlag(flagId, decision);
        if (res.ok) {
          toast.success(decision === "confirm" ? "Flag confirmed" : "Flag dismissed");
        } else {
          toast.error("Couldn't update the flag.");
        }
      } catch {
        toast.error("Couldn't update the flag.");
      } finally {
        setBusyId(null);
      }
    });
  }

  if (flags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No anticheat flags yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Finding</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((f) => {
            const actionable = f.status === "open" || f.status === "reviewing";
            const disabled = pending && busyId === f.flagId;
            return (
              <TableRow key={f.flagId}>
                <TableCell className="font-medium">
                  {f.persona ?? f.steamid64 ?? "Unknown"}
                  {f.steamid64 ? (
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      {f.steamid64}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{f.eventKind ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[f.severity] ?? "outline"}>
                    {f.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={f.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(f.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {actionable ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={disabled}
                        onClick={() => act(f.flagId, "confirm")}
                      >
                        <Check className="size-4" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => act(f.flagId, "dismiss")}
                      >
                        <X className="size-4" /> Dismiss
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm capitalize">
                      {f.status}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "confirmed":
      return <Badge variant="destructive">Confirmed</Badge>;
    case "dismissed":
      return <Badge variant="outline">Dismissed</Badge>;
    case "reviewing":
      return <Badge variant="secondary">Reviewing</Badge>;
    default:
      return <Badge>Open</Badge>;
  }
}
