"use client";

import { RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import type { DashboardDigestStatus } from "@/entities/dashboard/model/use-dashboard-digest";

export type MorningDigestCardProps = {
  text: string;
  status: DashboardDigestStatus;
  onRegenerate: () => void;
  onAskAgent?: () => void;
  className?: string;
};

export function MorningDigestCard({
  text,
  status,
  onRegenerate,
  onAskAgent,
  className,
}: MorningDigestCardProps) {
  if (status === "idle" || status === "unavailable") {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">
            Morning digest
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Superbot · today&apos;s read
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onRegenerate}
          disabled={status === "streaming"}
        >
          <RefreshCw
            className={cn("h-3 w-3", status === "streaming" && "animate-spin")}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        {status === "error" ? (
          <p className="text-muted-foreground">
            Couldn&apos;t generate today&apos;s digest. Try refresh.
          </p>
        ) : (
          <p className="whitespace-pre-wrap">
            {text}
            {status === "streaming" ? (
              <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle" />
            ) : null}
          </p>
        )}
        {status === "done" && onAskAgent ? (
          <Button size="sm" variant="outline" onClick={onAskAgent}>
            Ask the agent more
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
