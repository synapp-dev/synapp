"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { recordNewsArticleViewAction } from "../actions/news-view-actions";
import type { NewsViewBreakdown } from "../lib/views/queries";

function fmt(n: number): string {
  return n.toLocaleString();
}

type ArticleViewCounterProps = {
  articleId: string;
  initial: NewsViewBreakdown;
  className?: string;
};

/**
 * Headline total ("X views") with a hover breakdown (unique · members ·
 * anonymous). Records this view once on mount and reflects the fresh count.
 */
export function ArticleViewCounter({
  articleId,
  initial,
  className,
}: ArticleViewCounterProps) {
  const [breakdown, setBreakdown] = useState<NewsViewBreakdown>(initial);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    let active = true;
    void recordNewsArticleViewAction(articleId).then((fresh) => {
      if (active && fresh) setBreakdown(fresh);
    });
    return () => {
      active = false;
    };
  }, [articleId]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-default select-none items-center gap-1.5 text-sm text-muted-foreground",
              className,
            )}
          >
            <Eye className="size-4" />
            <span>
              <span className="font-semibold text-foreground">
                {fmt(breakdown.total)}
              </span>{" "}
              {breakdown.total === 1 ? "view" : "views"}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="flex items-center gap-2 border border-muted bg-background px-3 py-2 text-muted-foreground"
        >
          <span className="text-xs">
            <span className="font-bold text-foreground">
              {fmt(breakdown.unique)}
            </span>{" "}
            unique
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs">
            <span className="font-bold text-foreground">
              {fmt(breakdown.members)}
            </span>{" "}
            members
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs">
            <span className="font-bold text-foreground">
              {fmt(breakdown.anonymous)}
            </span>{" "}
            anonymous
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
