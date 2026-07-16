"use client";

import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type {
  OrderGuideReasoningStatus,
  OrderGuideSupplierRead,
} from "@/entities/purchase-orders/model/use-order-guide-reasoning";

/**
 * Slim, one-line read on the whole order run. Sits above the supplier
 * carousel so the operator gets the headline without a wall of text.
 */
export function OrderGuideRunHeadline({
  headline,
  status,
  onRegenerate,
}: {
  headline: string | null;
  status: OrderGuideReasoningStatus;
  onRegenerate: () => void;
}) {
  if (status === "unavailable" || status === "idle") {
    return null;
  }

  return (
    <div className="border-primary/20 bg-muted/30 flex items-start gap-3 rounded-lg border px-4 py-3">
      <Sparkles className="text-primary mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {status === "loading" && !headline ? (
          <div className="bg-muted-foreground/20 h-4 w-2/3 animate-pulse rounded" />
        ) : status === "error" ? (
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t read this run.
          </p>
        ) : (
          <p className="text-sm leading-relaxed font-medium">{headline}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 gap-1.5 text-xs"
        onClick={onRegenerate}
        disabled={status === "loading"}
      >
        <RefreshCw className={cn("h-3 w-3", status === "loading" && "animate-spin")} />
        Regenerate
      </Button>
    </div>
  );
}

/**
 * Superbot's read on a single supplier, rendered inline inside that
 * supplier's dashboard card — a headline plus a few operator-language
 * points and any data-quality watchouts.
 */
export function SupplierReasoningPanel({
  read,
  status,
}: {
  read: OrderGuideSupplierRead | undefined;
  status: OrderGuideReasoningStatus;
}) {
  if (status === "unavailable" || status === "idle") {
    return null;
  }

  const loading = status === "loading" && !read;

  return (
    <div className="border-primary/15 bg-primary/[0.03] rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="text-primary h-3.5 w-3.5" />
        <span className="text-xs font-semibold tracking-wide uppercase">
          Superbot&apos;s read
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="bg-muted-foreground/20 h-4 w-4/5 animate-pulse rounded" />
          <div className="bg-muted-foreground/15 h-3 w-3/5 animate-pulse rounded" />
          <div className="bg-muted-foreground/15 h-3 w-2/3 animate-pulse rounded" />
        </div>
      ) : status === "error" ? (
        <p className="text-muted-foreground text-sm">
          Couldn&apos;t generate a read for this supplier.
        </p>
      ) : read ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed font-medium">{read.headline}</p>
          {read.points.length > 0 ? (
            <ul className="space-y-1.5">
              {read.points.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="text-primary mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {read.watchouts.length > 0 ? (
            <ul className="space-y-1.5 border-t border-amber-500/20 pt-3">
              {read.watchouts.map((watchout, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{watchout}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No specific notes for this supplier — the lines below cover forecasted
          demand with buffer.
        </p>
      )}
    </div>
  );
}
