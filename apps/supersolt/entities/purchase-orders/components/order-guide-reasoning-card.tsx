"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { useOrderGuideReasoning } from "@/entities/purchase-orders/model/use-order-guide-reasoning";

type OrderGuideReasoningCardProps = {
  organisation: string;
  venue: string;
  periodPreset: string;
  /** Changes when the guide recomputes; drives a fresh briefing. */
  runKey: string | null;
  enabled: boolean;
};

export function OrderGuideReasoningCard({
  organisation,
  venue,
  periodPreset,
  runKey,
  enabled,
}: OrderGuideReasoningCardProps) {
  const { text, status, error, regenerate } = useOrderGuideReasoning({
    organisation,
    venue,
    periodPreset,
    runKey,
    enabled,
  });

  if (!enabled || status === "unavailable" || status === "idle") {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="text-primary h-4 w-4" />
          Superbot&apos;s read on this order run
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => void regenerate()}
          disabled={status === "streaming"}
        >
          <RefreshCw
            className={cn("h-3 w-3", status === "streaming" && "animate-spin")}
          />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {status === "error" ? (
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t generate the briefing{error ? `: ${error}` : ""}. Try
            regenerate.
          </p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {text}
            {status === "streaming" ? (
              <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle" />
            ) : null}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
