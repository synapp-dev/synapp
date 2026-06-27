"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, Server } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import type { ScrimDetail, TeamServer } from "../../types";

function connectString(s: TeamServer): string {
  return `connect ${s.ip}:${s.port}${s.password ? `; password ${s.password}` : ""}`;
}

export function ScrimServerBox({
  scrim,
  servers,
}: {
  scrim: ScrimDetail;
  servers: (TeamServer & { teamName: string })[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(servers[0]?.id ?? null);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [withinWindow, setWithinWindow] = useState(false);

  useEffect(() => {
    const check = () => {
      const minutes = (Date.now() - new Date(scrim.matchTime).getTime()) / 60000;
      setWithinWindow(minutes >= -15 && minutes <= 120);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [scrim.matchTime]);

  const selected = useMemo(
    () => servers.find((s) => s.id === selectedId) ?? null,
    [servers, selectedId],
  );

  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(connectString(selected));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (servers.length === 0) {
    return (
      <div className="flex h-16 w-full items-center justify-center rounded-lg border bg-card px-4 text-center text-xs text-muted-foreground">
        No server connect details available. Add one in your team settings.
      </div>
    );
  }

  if (!withinWindow) {
    return (
      <div className="flex h-16 w-full items-center justify-center rounded-lg border bg-card px-4 text-center text-xs text-muted-foreground">
        Server details appear 15 minutes before the scheduled match.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
        <SelectTrigger className="w-full">
          <span className="flex items-center gap-2">
            <Server className="size-4" />
            <SelectValue placeholder="Select server" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {servers.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.teamName}
              {s.label ? ` · ${s.label}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <code className="flex-1 truncate text-xs">
          {selected ? (reveal ? connectString(selected) : "details hidden…") : ""}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide details" : "Show details"}
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={copy} aria-label="Copy">
          {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
