"use client";

import { Users } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

export function MatchFoundStep() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/40">
        <Users className="size-7 text-emerald-400" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Match found</h2>
        <p className="text-sm text-muted-foreground">
          10 / 10 players locked. Accept phase is next (mock).
        </p>
      </div>
      <Badge variant="secondary" className="text-xs">
        Pending match · sandbox-1
      </Badge>
    </div>
  );
}
