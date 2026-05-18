"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import type { DashboardMorningDigestData } from "@/entities/dashboard/model/dummy-dashboard-data";

export type MorningDigestCardProps = {
  digest: DashboardMorningDigestData;
  className?: string;
};

export function MorningDigestCard({ digest, className }: MorningDigestCardProps) {
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
            Agent · today&apos;s read
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {digest.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {digest.insightHeadline ? (
          <div className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-foreground">
            <p className="text-xs font-medium text-muted-foreground">
              {digest.insightHeadline}
            </p>
            {digest.insightBody ? (
              <p className="mt-1 text-sm text-foreground/90">{digest.insightBody}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" asChild>
          <Link href="/agent">Ask the agent more</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
